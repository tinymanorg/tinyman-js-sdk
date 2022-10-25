import algosdk, {
  Algodv2,
  ALGORAND_MIN_TX_FEE,
  getApplicationAddress,
  Transaction
} from "algosdk";

import {CONTRACT_VERSION} from "../../contract/constants";
import {TinymanAnalyticsApiAsset} from "../../util/asset/assetModels";
import {
  SupportedNetwork,
  SignerTransaction,
  InitiatorSigner
} from "../../util/commonTypes";
import {MINIMUM_BALANCE_REQUIRED_PER_ASSET} from "../../util/constant";
import TinymanError from "../../util/error/TinymanError";
import {PoolInfo, PoolStatus} from "../../util/pool/poolTypes";
import {getPoolInfo} from "../../util/pool/poolUtils";
import {encodeString, waitForConfirmation} from "../../util/util";
import {getValidatorAppID} from "../../validator";
import {getPoolAccountMinBalance} from "../common/utils";
import {isAlgo, prepareAssetPairData, sortAssetIds} from "../../util/asset/assetUtils";
import {tinymanContract_v2} from "../../contract/v2/contract";
import {AccountInformation} from "../../util/account/accountTypes";

enum BootstrapTxnGroupIndices {
  FUNDING_TXN = 0,
  VALIDATOR_APP_CALL
}

/**
 * Inner txn counts according to the pool type (ASA-ALGO or ASA-ASA)
 */
const V2_BOOTSTRAP_INNER_TXN_COUNT = {
  ASA_ALGO: 5,
  ASA_ASA: 6
} as const;

async function generateTxns({
  client,
  network,
  asset_1,
  asset_2,
  initiatorAddr
}: {
  client: Algodv2;
  network: SupportedNetwork;
  asset_1: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
  asset_2: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
  const appAddress = getApplicationAddress(validatorAppID);

  // Make sure asset1 has greater ID
  const [{id: asset1ID}, {id: asset2ID}] = prepareAssetPairData(asset_1, asset_2);

  const poolInfo = await getPoolInfo({
    client,
    network,
    contractVersion: CONTRACT_VERSION.V2,
    asset1ID,
    asset2ID
  });

  if (poolInfo.status === PoolStatus.READY) {
    throw new Error(`Pool for ${asset_1.unit_name}-${asset_2.unit_name} already exists`);
  }

  const poolLogicSig = tinymanContract_v2.generateLogicSigAccountForPool({
    network,
    asset1ID,
    asset2ID
  });
  const poolLogicSigAddress = poolLogicSig.address();
  const isAlgoPool = isAlgo(asset2ID);
  const appCallTxn = algosdk.makeApplicationOptInTxnFromObject({
    from: poolLogicSigAddress,
    appIndex: validatorAppID,
    appArgs: [encodeString("bootstrap")],
    foreignAssets: [asset1ID, asset2ID],
    rekeyTo: appAddress,
    suggestedParams
  });

  appCallTxn.fee = getBootstrapAppCallTxnFee(isAlgoPool);

  const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolLogicSigAddress,
    amount: getBootstrapFundingTxnAmount(isAlgoPool),
    suggestedParams
  });

  let txns: Transaction[] = [];

  txns[BootstrapTxnGroupIndices.FUNDING_TXN] = fundingTxn;
  txns[BootstrapTxnGroupIndices.VALIDATOR_APP_CALL] = appCallTxn;

  /**
   * TODO: Ideally we need to return txns without grouping them
   * in order to support txn composition, but that caused
   * a weird bug: https://hipo.slack.com/archives/C03AE5QEHN1/p1666726549862249
   */
  const txGroup = algosdk.assignGroupID(txns);

  let signerTxns: SignerTransaction[] = [];

  signerTxns[BootstrapTxnGroupIndices.FUNDING_TXN] = {
    txn: txGroup[BootstrapTxnGroupIndices.FUNDING_TXN],
    signers: [initiatorAddr]
  };
  signerTxns[BootstrapTxnGroupIndices.VALIDATOR_APP_CALL] = {
    txn: txGroup[BootstrapTxnGroupIndices.VALIDATOR_APP_CALL],
    signers: [poolLogicSigAddress]
  };

  return signerTxns;
}

function getBootstrapFundingTxnAmount(isAlgoPool: boolean) {
  return (
    getPoolAccountMinBalance(CONTRACT_VERSION.V2, isAlgoPool) +
    getBootstrapAppCallTxnFee(isAlgoPool) +
    MINIMUM_BALANCE_REQUIRED_PER_ASSET // Min fee for asset creation
  );
}

function getBootstrapAppCallTxnFee(isAlgoPool: boolean) {
  const innerTxnCount = isAlgoPool
    ? V2_BOOTSTRAP_INNER_TXN_COUNT.ASA_ALGO
    : V2_BOOTSTRAP_INNER_TXN_COUNT.ASA_ASA;
  // Add 1 to the txn count to account for the group transaction itself.
  const totalTxnCount = innerTxnCount + 1;

  return totalTxnCount * ALGORAND_MIN_TX_FEE;
}

async function signTxns({
  txGroup,
  network,
  initiatorSigner,
  asset1ID,
  asset2ID
}: {
  txGroup: SignerTransaction[];
  network: SupportedNetwork;
  initiatorSigner: InitiatorSigner;
  asset1ID: number;
  asset2ID: number;
}): Promise<{signedTxns: Uint8Array[]; txnIDs: string[]}> {
  const [signedFundingTxn] = await initiatorSigner([txGroup]);

  // Make sure asset1 has greater ID
  const [sortedAsset1ID, sortedAsset2ID] = sortAssetIds(asset1ID, asset2ID);

  const poolLogicSig = tinymanContract_v2.generateLogicSigAccountForPool({
    network,
    asset1ID: sortedAsset1ID,
    asset2ID: sortedAsset2ID
  });

  const txnIDs: string[] = [];
  const signedTxns = txGroup.map((txDetail, index) => {
    // Funding txn should be signed by the user
    if (index === BootstrapTxnGroupIndices.FUNDING_TXN) {
      txnIDs.push(txDetail.txn.txID().toString());
      return signedFundingTxn;
    }

    const {txID, blob} = algosdk.signLogicSigTransactionObject(
      txDetail.txn,
      poolLogicSig
    );

    txnIDs.push(txID);
    return blob;
  });

  return {signedTxns, txnIDs};
}

async function doBootstrap({
  client,
  signedTxns,
  txnIDs
}: {
  client: Algodv2;
  signedTxns: Uint8Array[];
  txnIDs: string[];
}): Promise<{liquidityTokenID: number}> {
  try {
    await client.sendRawTransaction(signedTxns).do();

    /**
     * TODO: We will do this extraction part in a better way once PoolInfo shape is updated
     **/
    const assetCreationResult = (await waitForConfirmation(
      client,
      txnIDs[BootstrapTxnGroupIndices.VALIDATOR_APP_CALL]
    )) as {
      "confirmed-round": number;
      "local-state-delta": {
        delta: AccountInformation["apps-local-state"][0]["key-value"];
      }[];
      txn: Transaction;
    };
    const POOL_TOKEN_ASSET_ID_KEY = btoa("pool_token_asset_id");
    const localState = assetCreationResult["local-state-delta"][0].delta;
    const poolTokenAssetId = localState?.find((kv) => kv.key === POOL_TOKEN_ASSET_ID_KEY)
      ?.value.uint;

    if (typeof poolTokenAssetId !== "number") {
      throw new Error(`Generated ID is not valid: got ${poolTokenAssetId}`);
    }

    return {
      liquidityTokenID: poolTokenAssetId
    };
  } catch (error: any) {
    throw new TinymanError(
      error,
      "We encountered something unexpected while bootstraping the pool. Try again later."
    );
  }
}

/**
 * Create an pool for an asset pair if it does not already exist. The initiator will provide
 * funding to create the pool and pay for the creation transaction fees.
 */
async function execute({
  client,
  network,
  pool: {asset1ID, asset2ID},
  signedTxns,
  txnIDs
}: {
  client: Algodv2;
  network: SupportedNetwork;
  pool: {asset1ID: number; asset2ID: number};
  signedTxns: Uint8Array[];
  txnIDs: string[];
}): Promise<PoolInfo> {
  await doBootstrap({client, signedTxns, txnIDs});

  return getPoolInfo({
    client,
    network,
    contractVersion: CONTRACT_VERSION.V2,
    asset1ID,
    asset2ID
  });
}

export const BootstrapV2 = {
  generateTxns,
  signTxns,
  execute,
  getBootstrapFundingTxnAmount
};
