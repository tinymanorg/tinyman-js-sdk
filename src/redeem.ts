import algosdk from "algosdk";
import {fromByteArray, toByteArray} from "base64-js";

import {
  decodeState,
  getAssetInformationById,
  joinUint8Arrays,
  waitForTransaction
} from "./util";
import {getPoolAssets, getPoolInfo, PoolInfo} from "./pool";
import {
  AccountInformationData,
  AlgorandMobileApiAsset,
  InitiatorSigner
} from "./common-types";

const REDEEM_ENCODED = Uint8Array.from([114, 101, 100, 101, 101, 109]); // 'redeem'

/**
 * Execute a redeem operation to collect excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or liquidityTokenID.
 * @param params.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function redeemExcessAsset({
  client,
  pool,
  assetID,
  assetOut,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  assetID: number;
  assetOut: number | bigint;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<{
  fees: number;
  confirmedRound: number;
}> {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: pool.addr,
    appIndex: pool.validatorAppID,
    appArgs: [REDEEM_ENCODED],
    accounts: [initiatorAddr],
    foreignAssets:
      // eslint-disable-next-line eqeqeq
      pool.asset2ID == 0
        ? [pool.asset1ID, <number>pool.liquidityTokenID]
        : [pool.asset1ID, pool.asset2ID, <number>pool.liquidityTokenID],
    suggestedParams
  });

  let assetOutTxn;

  if (assetID === 0) {
    assetOutTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      amount: assetOut,
      suggestedParams
    });
  } else {
    assetOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      assetIndex: assetID,
      amount: assetOut,
      suggestedParams
    });
  }

  let txnFees = validatorAppCallTxn.fee + assetOutTxn.fee;

  const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    amount: validatorAppCallTxn.fee + assetOutTxn.fee,
    suggestedParams
  });

  txnFees += feeTxn.fee;

  const txGroup: any[] = algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    assetOutTxn
  ]);

  const lsig = algosdk.makeLogicSig(pool.program);
  const [signedFeeTxn] = await initiatorSigner([txGroup[0]]);

  const signedTxns = txGroup.map((txn, index) => {
    if (index === 0) {
      return signedFeeTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txn, lsig);

    return blob;
  });

  const {txId} = await client.sendRawTransaction(signedTxns).do();

  const status = await waitForTransaction(client, txId);
  const confirmedRound: number = status["confirmed-round"];

  return {
    fees: txnFees,
    confirmedRound
  };
}

export interface ExcessAmountData {
  poolAddress: string;
  assetID: number;
  amount: number;
}

/**
 * Generates a list of excess amounts accumulated within an account.
 * @param params.client An Algodv2 client.
 * @param params.accountAddr The address of the account performing the redeem operation.
 * @param params.validatorAppID Validator APP ID
 * @returns List of excess amounts
 */
export async function getExcessAmounts({
  client,
  accountAddr,
  validatorAppID
}: {
  client: any;
  accountAddr: string;
  validatorAppID: number;
}) {
  const info = (await client
    .accountInformation(accountAddr)
    .setIntDecoding("bigint")
    .do()) as AccountInformationData;

  const appsLocalState = info["apps-local-state"] || [];
  const appState = appsLocalState.find(
    // `==` is used here to coerce bigints if necessary
    // eslint-disable-next-line eqeqeq
    (appLocalState) => appLocalState.id == validatorAppID
  );
  let excessData: ExcessAmountData[] = [];

  if (appState && appState["key-value"]) {
    const state = decodeState(appState["key-value"]);

    for (let entry of Object.entries(state)) {
      const [key, value] = entry;
      const decodedKey = toByteArray(key);

      if (decodedKey.length === 41 && decodedKey[32] === 101) {
        excessData.push({
          poolAddress: algosdk.encodeAddress(decodedKey.slice(0, 32)),
          assetID: algosdk.decodeUint64(decodedKey.slice(33, 41), "safe"),
          amount: parseInt(value as string)
        });
      }
    }
  }

  return excessData;
}

export interface ExcessAmountDataWithPoolAssetDetails {
  pool: {info: PoolInfo; asset1: AlgorandMobileApiAsset; asset2: AlgorandMobileApiAsset};
  asset: AlgorandMobileApiAsset;
  amount: number;
}

/**
 * Generates a list of excess amounts accumulated within an account. Each item includes details of pool and its assets.
 * @param params.client An Algodv2 client.
 * @param params.accountAddr The address of the account performing the redeem operation.
 * @param params.validatorAppID Validator APP ID
 * @returns List of excess amounts
 */
export async function getExcessAmountsWithPoolAssetDetails({
  client,
  accountAddr,
  validatorAppID
}: {
  client: any;
  accountAddr: string;
  validatorAppID: number;
}) {
  const excessData = await getExcessAmounts({client, accountAddr, validatorAppID});
  let excessDataWithDetail: ExcessAmountDataWithPoolAssetDetails[] = [];

  for (let data of excessData) {
    const {poolAddress, assetID, amount} = data;
    const poolAssets = await getPoolAssets({
      client,
      address: poolAddress,
      validatorAppID
    });

    if (poolAssets) {
      const poolInfo = await getPoolInfo(client, {
        validatorAppID,
        asset1ID: poolAssets.asset1ID,
        asset2ID: poolAssets.asset2ID
      });
      const assetDetails = await Promise.all([
        getAssetInformationById(client, poolAssets.asset1ID),
        getAssetInformationById(client, poolAssets.asset2ID)
      ]);

      excessDataWithDetail.push({
        amount,
        asset: assetID === assetDetails[0].asset_id ? assetDetails[0] : assetDetails[1],
        pool: {
          info: poolInfo,
          asset1: assetDetails[0],
          asset2: assetDetails[1]
        }
      });
    }
  }

  return excessDataWithDetail;
}
