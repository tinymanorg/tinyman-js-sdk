import algosdk, {Algodv2, ALGORAND_MIN_TX_FEE, Transaction} from "algosdk";

import {tinymanContract_v1_1} from "../../contract/contract";
import {
  InitiatorSigner,
  SignerTransaction,
  SupportedNetwork
} from "../../util/commonTypes";
import {encodeString, isAlgo, waitForConfirmation} from "../../util/util";
import TinymanError from "../../util/error/TinymanError";
import {LIQUIDITY_TOKEN_UNIT_NAME} from "../../util/asset/assetConstants";
import {PoolInfo} from "../../util/pool/poolTypes";
import {getPoolInfo} from "../../util/pool/poolUtils";
import {getPoolAccountMinBalance} from "../common/utils";
import {getValidatorAppID} from "../../validator";
import {CONTRACT_VERSION} from "../../contract/constants";

enum BootstrapTxnGroupIndices {
  FUNDING_TXN = 0,
  VALIDATOR_APP_CALL,
  LIQUIDITY_TOKEN_CREATE,
  ASSET1_OPT_IN,
  ASSET2_OPT_IN
}

/**
 * Txn counts according to the pool type (ASA-ASA or ASA-Algo)
 * If it's ASA-Algo, there won't be `asset2Optin` txn within the bootstrap txn group
 */
const V1_BOOTSTRAP_TXN_COUNT = {
  ASA_ALGO: 4,
  ASA_ASA: 5
} as const;

async function generateTxns({
  client,
  network,
  asset1ID,
  asset2ID,
  asset1UnitName,
  asset2UnitName,
  initiatorAddr
}: {
  client: Algodv2;
  network: SupportedNetwork;
  asset1ID: number;
  asset2ID: number;
  asset1UnitName: string;
  asset2UnitName: string;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V1_1);
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

  const isAlgoPool = isAlgo(assets.asset2.id);

  const poolLogicSig = tinymanContract_v1_1.generateLogicSigAccountForPool({
    network,
    asset1ID: assets.asset1.id,
    asset2ID: assets.asset2.id
  });
  const poolAddress = poolLogicSig.address();

  const validatorAppCallTxn = algosdk.makeApplicationOptInTxnFromObject({
    from: poolAddress,
    appIndex: validatorAppID,
    appArgs: [
      encodeString("bootstrap"),
      algosdk.encodeUint64(assets.asset1.id),
      algosdk.encodeUint64(assets.asset2.id)
    ],
    foreignAssets: isAlgoPool ? [assets.asset1.id] : [assets.asset1.id, assets.asset2.id],
    suggestedParams
  });

  const liquidityTokenCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(
    {
      from: poolAddress,
      total: 0xffffffffffffffffn,
      decimals: 6,
      defaultFrozen: false,
      unitName: LIQUIDITY_TOKEN_UNIT_NAME.DEFAULT,
      assetName: `TinymanPool1.1 ${assets.asset1.unitName}-${assets.asset2.unitName}`,
      assetURL: "https://tinyman.org",
      suggestedParams
    }
  );

  const asset1Optin = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: poolAddress,
    to: poolAddress,
    assetIndex: assets.asset1.id,
    amount: 0,
    suggestedParams
  });

  const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    amount: getBootstrapFundingTxnAmountForV1(isAlgoPool),
    suggestedParams
  });

  let txns: Transaction[] = [
    fundingTxn,
    validatorAppCallTxn,
    liquidityTokenCreateTxn,
    asset1Optin
  ];

  if (!isAlgoPool) {
    txns.push(
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: poolAddress,
        to: poolAddress,
        assetIndex: assets.asset2.id,
        amount: 0,
        suggestedParams
      })
    );
  }

  const txGroup = algosdk.assignGroupID(txns);

  let finalSignerTxns: SignerTransaction[] = [
    {txn: txGroup[0], signers: [initiatorAddr]},
    {txn: txGroup[1], signers: [poolAddress]},
    {txn: txGroup[2], signers: [poolAddress]},
    {txn: txGroup[3], signers: [poolAddress]}
  ];

  if (txGroup[4]) {
    finalSignerTxns.push({
      txn: txGroup[4],
      signers: [poolAddress]
    });
  }

  return finalSignerTxns;
}

function getBootstrapFundingTxnAmountForV1(isAlgoPool: boolean) {
  /**
   * TODO:
   * Compare return values with docs:
   * Total costs for Pool Creation:
   *  ASA-ASA Pool: 0.961 Algo
   *  ASA-Algo Pool: 0.86 Algo
   */
  return (
    getPoolAccountMinBalance(CONTRACT_VERSION.V1_1, isAlgoPool) +
    getBootstrapProcessTxnCount(isAlgoPool) * ALGORAND_MIN_TX_FEE
  );
}

function getBootstrapProcessTxnCount(isAlgoPool: boolean) {
  return isAlgoPool ? V1_BOOTSTRAP_TXN_COUNT.ASA_ALGO : V1_BOOTSTRAP_TXN_COUNT.ASA_ASA;
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

  const poolLogicSig = tinymanContract_v1_1.generateLogicSigAccountForPool({
    network,
    asset1ID: assets.asset1ID,
    asset2ID: assets.asset2ID
  });

  const txnIDs: string[] = [];
  const signedTxns = txGroup.map((txDetail, index) => {
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
      txnIDs[BootstrapTxnGroupIndices.LIQUIDITY_TOKEN_CREATE]
    );

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
    contractVersion: CONTRACT_VERSION.V1_1,
    asset1ID: pool.asset1ID,
    asset2ID: pool.asset2ID
  });
}

export const BootstrapV1_1 = {
  generateTxns,
  signTxns,
  execute
};
