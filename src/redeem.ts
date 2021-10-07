import algosdk, {Algodv2, Transaction} from "algosdk";
import {toByteArray} from "base64-js";

import {
  bufferToBase64,
  decodeState,
  getAssetInformationById,
  getTxnGroupID,
  sendAndWaitRawTransaction,
  sumUpTxnFees
} from "./util";
import {getPoolAssets, getPoolInfo, PoolInfo} from "./pool";
import {
  TinymanAnalyticsApiAsset,
  InitiatorSigner,
  SignerTransaction
} from "./common-types";
import {AccountInformation} from "./account/accountTypes";
import {DEFAULT_FEE_TXN_NOTE} from "./constant";
import TinymanError from "./error/TinymanError";

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
  txGroup,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<{
  fees: number;
  confirmedRound: number;
  groupID: string;
  txnID: string;
}> {
  try {
    const signedTxns = await signRedeemTxns({
      txGroup,
      pool,
      initiatorSigner
    });
    const [{txnID, confirmedRound}] = await sendAndWaitRawTransaction(client, [
      signedTxns
    ]);

    return {
      fees: sumUpTxnFees(txGroup),
      confirmedRound,
      txnID,
      groupID: getTxnGroupID(txGroup)
    };
  } catch (error) {
    throw new TinymanError(
      error,
      "We encountered something unexpected while redeeming. Try again later."
    );
  }
}

async function signRedeemTxns({
  txGroup,
  pool,
  initiatorSigner
}: {
  txGroup: SignerTransaction[];
  pool: PoolInfo;
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  const [signedFeeTxn] = await initiatorSigner([txGroup]);
  const lsig = algosdk.makeLogicSig(pool.program);

  const signedTxns = txGroup.map((txDetail, index) => {
    if (index === 0) {
      return signedFeeTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txDetail.txn, lsig);

    return blob;
  });

  return signedTxns;
}

/**
 * Execute redeem operations to collect all excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.data.pool Information for the pool.
 * @param params.data.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or liquidityTokenID.
 * @param params.data.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function redeemAllExcessAsset({
  client,
  data,
  initiatorSigner
}: {
  client: any;
  data: {pool: PoolInfo; txGroup: SignerTransaction[]}[];
  initiatorSigner: InitiatorSigner;
}): Promise<
  {
    fees: number;
    confirmedRound: number;
    groupID: string;
    txnID: string;
  }[]
> {
  try {
    const redeemGroups = data.map(({txGroup, pool}) => {
      return {
        txns: txGroup,
        txnFees: sumUpTxnFees(txGroup),
        groupID: getTxnGroupID(txGroup),
        lsig: algosdk.makeLogicSig(pool.program)
      };
    });

    const signedFeeTxns = await initiatorSigner(redeemGroups.map((item) => item.txns));

    const redeemTxnsPromise = Promise.all(
      redeemGroups.map(
        (redeemGroup, groupIndex) =>
          new Promise<{
            fees: number;
            confirmedRound: number;
            groupID: string;
            txnID: string;
          }>(async (resolve, reject) => {
            try {
              const signedTxns = redeemGroup.txns.map((txDetail, txnIndex) => {
                if (txnIndex === 0) {
                  // Get the txn signed by initiator
                  return signedFeeTxns[groupIndex];
                }
                const {blob} = algosdk.signLogicSigTransactionObject(
                  txDetail.txn,
                  redeemGroup.lsig
                );

                return blob;
              });

              const [{txnID, confirmedRound}] = await sendAndWaitRawTransaction(client, [
                signedTxns
              ]);

              resolve({
                fees: redeemGroup.txnFees,
                groupID: redeemGroup.groupID,
                txnID,
                confirmedRound
              });
            } catch (error) {
              reject(error);
            }
          })
      )
    );

    return redeemTxnsPromise;
  } catch (error) {
    throw new TinymanError(
      error,
      "We encountered something unexpected while redeeming. Try again later."
    );
  }
}

export const REDEEM_PROCESS_TXN_COUNT = 3;

export async function generateRedeemTxns({
  client,
  pool,
  assetID,
  assetOut,
  initiatorAddr
}: {
  client: Algodv2;
  pool: PoolInfo;
  assetID: number;
  assetOut: number | bigint;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: pool.addr,
    appIndex: pool.validatorAppID,
    appArgs: [REDEEM_ENCODED],
    accounts: [initiatorAddr],
    foreignAssets:
      // eslint-disable-next-line eqeqeq
      pool.asset2ID == 0
        ? [pool.asset1ID, pool.liquidityTokenID as number]
        : [pool.asset1ID, pool.asset2ID, pool.liquidityTokenID as number],
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

  const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    amount: validatorAppCallTxn.fee + assetOutTxn.fee,
    note: DEFAULT_FEE_TXN_NOTE,
    suggestedParams
  });

  const txGroup = algosdk.assignGroupID([feeTxn, validatorAppCallTxn, assetOutTxn]);

  return [
    {
      txn: txGroup[0],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[1],
      signers: [pool.addr]
    },
    {
      txn: txGroup[2],
      signers: [pool.addr]
    }
  ];
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
    .do()) as AccountInformation;

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
  pool: {
    info: PoolInfo;
    asset1: TinymanAnalyticsApiAsset;
    asset2: TinymanAnalyticsApiAsset;
    liquidityAsset: TinymanAnalyticsApiAsset;
  };
  asset: TinymanAnalyticsApiAsset;
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
        getAssetInformationById(client, poolAssets.asset2ID),
        getAssetInformationById(client, poolInfo.liquidityTokenID!)
      ]);
      let excessAsset = assetDetails[0];

      if (assetID === Number(assetDetails[1].id)) {
        excessAsset = assetDetails[1];
      } else if (assetID === Number(assetDetails[2]?.id)) {
        excessAsset = assetDetails[2];
      }

      excessDataWithDetail.push({
        amount,
        asset: excessAsset,
        pool: {
          info: poolInfo,
          asset1: assetDetails[0],
          asset2: assetDetails[1],
          liquidityAsset: assetDetails[2]
        }
      });
    }
  }

  return excessDataWithDetail;
}
