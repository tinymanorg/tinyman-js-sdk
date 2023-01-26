import algosdk, {Algodv2} from "algosdk";

import {
  encodeString,
  getTxnGroupID,
  sendAndWaitRawTransaction,
  sumUpTxnFees
} from "./util/util";
import {InitiatorSigner, SignerTransaction} from "./util/commonTypes";
import {DEFAULT_FEE_TXN_NOTE} from "./util/constant";
import TinymanError from "./util/error/TinymanError";
import {V1PoolInfo} from "./util/pool/poolTypes";
import {tinymanJSSDKConfig} from "./config";

/**
 * Execute a redeem operation to collect excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function redeemExcessAsset({
  client,
  pool,
  txGroup,
  initiatorSigner
}: {
  client: Algodv2;
  pool: V1PoolInfo;
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
  } catch (error: any) {
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
  pool: V1PoolInfo;
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  const [signedFeeTxn] = await initiatorSigner([txGroup]);
  const {lsig} = pool.account;

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
 *   asset1ID, asset2ID, or poolTokenID.
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
  client: Algodv2;
  data: {pool: V1PoolInfo; txGroup: SignerTransaction[]}[];
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
        lsig: pool.account.lsig
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
            } catch (error: any) {
              reject(error);
            }
          })
      )
    );

    return redeemTxnsPromise;
  } catch (error: any) {
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
  pool: V1PoolInfo;
  assetID: number;
  assetOut: number | bigint;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const poolAddress = pool.account.address();
  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: poolAddress,
    appIndex: pool.validatorAppID,
    appArgs: [encodeString("redeem")],
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(pool.contractVersion),
    accounts: [initiatorAddr],
    foreignAssets:
      pool.asset2ID == 0
        ? [pool.asset1ID, pool.poolTokenID as number]
        : [pool.asset1ID, pool.asset2ID, pool.poolTokenID as number],
    suggestedParams
  });

  let assetOutTxn;

  if (assetID === 0) {
    assetOutTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: poolAddress,
      to: initiatorAddr,
      amount: BigInt(assetOut),
      suggestedParams
    });
  } else {
    assetOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: poolAddress,
      to: initiatorAddr,
      assetIndex: assetID,
      amount: BigInt(assetOut),
      suggestedParams
    });
  }

  const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
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
      signers: [poolAddress]
    },
    {
      txn: txGroup[2],
      signers: [poolAddress]
    }
  ];
}
