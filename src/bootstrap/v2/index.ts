import algosdk, {Algodv2, ALGORAND_MIN_TX_FEE, getApplicationAddress} from "algosdk";

import {CONTRACT_VERSION} from "../../contract/constants";
import {TinymanAnalyticsApiAsset} from "../../util/asset/assetModels";
import {
  SupportedNetwork,
  SignerTransaction,
  InitiatorSigner
} from "../../util/commonTypes";
import {MINIMUM_BALANCE_REQUIRED_PER_ASSET} from "../../util/constant";
import TinymanError from "../../util/error/TinymanError";
import {PoolInfo} from "../../util/pool/poolTypes";
import {getPoolInfo} from "../../util/pool/poolUtils";
import {encodeString, waitForConfirmation} from "../../util/util";
import {getValidatorAppID} from "../../validator";
import {getPoolAccountMinBalance} from "../common/utils";
import {isAlgo, prepareAssetPairData, sortAssetIds} from "../../util/asset/assetUtils";
import {tinymanContract_v2} from "../../contract/v2/contract";

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
  const {
    asset1: {id: asset1ID},
    asset2: {id: asset2ID}
  } = prepareAssetPairData(asset_1, asset_2);

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
    suggestedParams: {
      ...suggestedParams,
      fee: getBootstrapAppCallTxnFee(isAlgoPool)
    }
  });

  const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolLogicSigAddress,
    amount: getBootstrapFundingTxnAmount(isAlgoPool),
    suggestedParams
  });

  let txns: SignerTransaction[] = [];

  txns[BootstrapTxnGroupIndices.FUNDING_TXN] = {
    txn: fundingTxn,
    signers: [initiatorAddr]
  };
  txns[BootstrapTxnGroupIndices.VALIDATOR_APP_CALL] = {
    txn: appCallTxn,
    signers: [poolLogicSigAddress]
  };

  return txns;
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

    const assetCreationResult = await waitForConfirmation(
      client,
      txnIDs[BootstrapTxnGroupIndices.VALIDATOR_APP_CALL]
    );

    // TODO: Do result type and used key is correct?
    const liquidityTokenID = assetCreationResult["asset-index"];

    if (typeof liquidityTokenID !== "number") {
      throw new Error(`Generated ID is not valid: got ${liquidityTokenID}`);
    }

    return {
      liquidityTokenID
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
