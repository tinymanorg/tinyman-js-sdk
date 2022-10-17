import algosdk, {Algodv2, ALGORAND_MIN_TX_FEE, getApplicationAddress} from "algosdk";

import {tinymanContract_v2} from "../../contract/contract";
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
import {encodeString, isAlgo, waitForConfirmation} from "../../util/util";
import {getValidatorAppID} from "../../validator";
import {getPoolAccountMinBalance} from "../common/utils";

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
  const {unit_name: asset1UnitName} = asset_1;
  const asset1ID = Number(asset_1.id);
  const {unit_name: asset2UnitName} = asset_2;
  const asset2ID = Number(asset_2.id);

  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
  const appAddress = getApplicationAddress(validatorAppID);

  // Make sure asset1 has greater ID
  const assets =
    asset1ID > asset2ID
      ? {
          asset1: {id: asset1ID, unitName: asset1UnitName},
          asset2: {id: asset2ID, unitName: asset2UnitName}
        }
      : {
          asset1: {id: asset2ID, unitName: asset2UnitName},
          asset2: {id: asset1ID, unitName: asset1UnitName}
        };

  const poolLogicSig = tinymanContract_v2.generateLogicSigAccountForPool({
    network,
    asset1ID: assets.asset1.id,
    asset2ID: assets.asset2.id
  });
  const poolLogicSigAddress = poolLogicSig.address();
  const appID = getValidatorAppID(network, CONTRACT_VERSION.V2);
  const isAlgoPool = isAlgo(assets.asset2.id);
  const appCallTxn = algosdk.makeApplicationOptInTxnFromObject({
    from: poolLogicSigAddress,
    appIndex: appID,
    appArgs: [encodeString("bootstrap")],
    foreignAssets: [assets.asset1.id, assets.asset2.id],
    rekeyTo: appAddress,
    suggestedParams: {
      ...suggestedParams,
      fee: getBootstrapAppCallTxnFeeForV2(isAlgoPool)
    }
  });

  const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolLogicSigAddress,
    amount: getBootstrapFundingTxnAmountForV2(isAlgoPool),
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

function getBootstrapFundingTxnAmountForV2(isAlgoPool: boolean) {
  return (
    getPoolAccountMinBalance(CONTRACT_VERSION.V2, isAlgoPool) +
    getBootstrapAppCallTxnFeeForV2(isAlgoPool) +
    MINIMUM_BALANCE_REQUIRED_PER_ASSET // Min fee for asset creation
  );
}

function getBootstrapAppCallTxnFeeForV2(isAlgoPool: boolean) {
  // Add 1 to the txn count to account for the group transaction itself.
  const totalTxnCount = getBootstrapInnerTxnCountForV2(isAlgoPool) + 1;

  /**
   * TODO: Is it ok to use `ALGORAND_MIN_TX_FEE` here?
   * - `suggestedParams.fee` returns 0, so we can't use it
   * - There is `algod.suggestedTransactionFee`, but we only have client in sdk
   **/
  return totalTxnCount * ALGORAND_MIN_TX_FEE;
}

function getBootstrapInnerTxnCountForV2(isAlgoPool: boolean) {
  return isAlgoPool
    ? V2_BOOTSTRAP_INNER_TXN_COUNT.ASA_ALGO
    : V2_BOOTSTRAP_INNER_TXN_COUNT.ASA_ASA;
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
  const assets =
    asset1ID > asset2ID ? {asset1ID, asset2ID} : {asset1ID: asset2ID, asset2ID: asset1ID};

  const poolLogicSig = tinymanContract_v2.generateLogicSigAccountForPool({
    network,
    asset1ID: assets.asset1ID,
    asset2ID: assets.asset2ID
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

    // TODO: Should we start using the method from `algosdk`?
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
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to create.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 * @param signedTxns Signed transactions
 * @param txnIDs Transaction IDs
 */
async function execute({
  client,
  network,
  pool,
  signedTxns,
  txnIDs
}: {
  client: Algodv2;
  network: SupportedNetwork;
  pool: {
    asset1ID: number;
    asset2ID: number;
  };
  signedTxns: Uint8Array[];
  txnIDs: string[];
}): Promise<PoolInfo> {
  await doBootstrap({
    client,
    signedTxns,
    txnIDs
  });

  return getPoolInfo({
    client,
    network,
    contractVersion: CONTRACT_VERSION.V2,
    asset1ID: pool.asset1ID,
    asset2ID: pool.asset2ID
  });
}

export const BootstrapV2 = {
  generateTxns,
  signTxns,
  execute
};
