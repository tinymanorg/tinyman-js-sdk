import algosdk, {Algodv2, Transaction} from "algosdk";

import {CONTRACT_VERSION, tinymanContract_v1_1} from "./contract/contract";
import {InitiatorSigner, SignerTransaction} from "./util/commonTypes";
import {encodeString, waitForConfirmation} from "./util/util";
import TinymanError from "./util/error/TinymanError";
import {ALGO_ASSET_ID, LIQUIDITY_TOKEN_UNIT_NAME} from "./util/asset/assetConstants";
import {
  BASE_MINIMUM_BALANCE,
  MINIMUM_BALANCE_REQUIRED_PER_APP,
  MINIMUM_BALANCE_REQUIRED_PER_ASSET,
  MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA,
  MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE
} from "./util/constant";
import {PoolInfo} from "./util/pool/poolTypes";
import {getPoolInfo} from "./util/pool/poolUtils";

enum BootstapTxnGroupIndices {
  FUNDING_TXN = 0,
  VALIDATOR_APP_CALL,
  LIQUIDITY_TOKEN_CREATE,
  ASSET1_OPT_IN,
  ASSET2_OPT_IN
}

export function getBootstrapProcessTxnCount(asset2ID: number) {
  // IF asset2 is ALGO, there won't be `asset2Optin` txn within the bootstrap txn group
  return ALGO_ASSET_ID === asset2ID ? 4 : 5;
}

export function calculatePoolBootstrapFundingTxnAmount(
  asset2ID: number,
  fees: {
    liquidityTokenCreateTxn: number;
    asset1OptinTxn: number;
    asset2OptinTxn: number;
    validatorAppCallTxn: number;
  }
) {
  const poolAccountMinBalance =
    BASE_MINIMUM_BALANCE +
    MINIMUM_BALANCE_REQUIRED_PER_ASSET + // min balance to create asset
    MINIMUM_BALANCE_REQUIRED_PER_ASSET + // fee + min balance to opt into asset 1
    (asset2ID === 0 ? 0 : MINIMUM_BALANCE_REQUIRED_PER_ASSET) + // min balance to opt into asset 2
    MINIMUM_BALANCE_REQUIRED_PER_APP + // min balance to opt into validator app
    MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE *
      tinymanContract_v1_1.schema.numLocalInts +
    MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA *
      tinymanContract_v1_1.schema.numLocalByteSlices;

  return (
    poolAccountMinBalance +
    fees.liquidityTokenCreateTxn +
    fees.asset1OptinTxn +
    fees.asset2OptinTxn +
    fees.validatorAppCallTxn
  );
}

export async function generateBootstrapTransactions({
  client,
  validatorAppID,
  asset1ID,
  asset2ID,
  asset1UnitName,
  asset2UnitName,
  initiatorAddr
}: {
  client: Algodv2;
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  asset1UnitName: string;
  asset2UnitName: string;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

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

  const poolLogicSig = tinymanContract_v1_1.generateLogicSigAccountForPool({
    asset1ID: assets.asset1.id,
    asset2ID: assets.asset2.id,
    //  TODO: Fix this
    network: "testnet"
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
    foreignAssets:
      assets.asset2.id == 0 ? [assets.asset1.id] : [assets.asset1.id, assets.asset2.id],
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

  const asset2Optin =
    assets.asset2.id === 0
      ? null
      : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: poolAddress,
          to: poolAddress,
          assetIndex: assets.asset2.id,
          amount: 0,
          suggestedParams
        });

  const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    amount: calculatePoolBootstrapFundingTxnAmount(assets.asset2.id, {
      liquidityTokenCreateTxn: liquidityTokenCreateTxn.fee,
      asset1OptinTxn: asset1Optin.fee,
      asset2OptinTxn: asset2Optin ? asset2Optin.fee : 0,
      validatorAppCallTxn: validatorAppCallTxn.fee
    }),
    suggestedParams
  });

  let txns: Transaction[] = [
    fundingTxn,
    validatorAppCallTxn,
    liquidityTokenCreateTxn,
    asset1Optin
  ];

  if (asset2Optin) {
    txns.push(asset2Optin);
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

export async function signBootstrapTransactions({
  txGroup,
  initiatorSigner,
  validatorAppID,
  asset1ID,
  asset2ID
}: {
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
}): Promise<{signedTxns: Uint8Array[]; txnIDs: string[]}> {
  const [signedFundingTxn] = await initiatorSigner([txGroup]);

  // Make sure asset1 has greater ID
  const assets =
    asset1ID > asset2ID
      ? {
          asset1ID,
          asset2ID
        }
      : {
          asset1ID: asset2ID,
          asset2ID: asset1ID
        };

  const poolLogicSig = tinymanContract_v1_1.generateLogicSigAccountForPool({
    asset1ID: assets.asset1ID,
    asset2ID: assets.asset2ID,
    // TODO: Fix this
    network: "testnet"
  });
  const lsig = poolLogicSig;

  const txnIDs: string[] = [];
  const signedTxns = txGroup.map((txDetail, index) => {
    if (index === BootstapTxnGroupIndices.FUNDING_TXN) {
      txnIDs.push(txDetail.txn.txID().toString());
      return signedFundingTxn;
    }
    const {txID, blob} = algosdk.signLogicSigTransactionObject(txDetail.txn, lsig);

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
      txnIDs[BootstapTxnGroupIndices.LIQUIDITY_TOKEN_CREATE]
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
export async function createPool(
  client: Algodv2,
  pool: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
  },
  signedTxns: Uint8Array[],
  txnIDs: string[]
): Promise<PoolInfo> {
  await doBootstrap({
    client,
    signedTxns,
    txnIDs
  });

  return getPoolInfo({
    client,
    //  TODO: Fix this
    network: "testnet",
    asset1ID: pool.asset1ID,
    asset2ID: pool.asset2ID,
    //  TODO: Fix this
    contractVersion: CONTRACT_VERSION.V1_1
  });
}
