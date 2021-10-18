import algosdk from "algosdk";

import {
  applySlippageToAmount,
  getTxnGroupID,
  sendAndWaitRawTransaction,
  sumUpTxnFees
} from "./util";
import {PoolInfo, getAccountExcess, PoolReserves} from "./pool";
import {InitiatorSigner, SignerTransaction} from "./common-types";
import {DEFAULT_FEE_TXN_NOTE} from "./constant";
import {ALGO_ASSET_ID} from "./asset/assetConstants";

/** An object containing information about a burn quote. */
export interface BurnQuote {
  /** The round that this quote is based on. */
  round: number;
  /** The ID of the first output asset in this quote. */
  asset1ID: number;
  /** The quantity of the first output asset in this quote. */
  asset1Out: bigint;
  /** The ID of the second output asset in this quote. */
  asset2ID: number;
  /** The quantity of the second output asset in this quote. */
  asset2Out: bigint;
  /** The ID of the input liquidity token asset in this quote. */
  liquidityID: number;
  /** The quantity of the input liquidity token asset in this quote. */
  liquidityIn: bigint;
}

/** An object containing information about a successfully executed  burn transaction. */
export interface BurnExecution {
  /** The round that the burn occurred in. */
  round: number;
  /**
   * The total amount of transaction fees that were spent (in microAlgos) to execute the burn and,
   * if applicable, redeem transactions.
   */
  fees: number;
  /** The ID of the first output asset. */
  asset1ID: number;
  /** The quantity of the first output asset. */
  asset1Out: bigint;
  /** The ID of the second output asset. */
  asset2ID: number;
  /** The quantity of the second output asset. */
  asset2Out: bigint;
  /** The ID of the liquidity token input asset. */
  liquidityID: number;
  /** The quantity of the liquidity token input asset. */
  liquidityIn: bigint;
  /** Excess amount details for the pool assets */
  excessAmounts: {
    assetID: number;
    excessAmountForBurning: bigint;
    totalExcessAmount: bigint;
  }[];
  /** The ID of the transaction. */
  txnID: string;
  /** The group ID for the transaction group. */
  groupID: string;
}

enum BurnTxnIndices {
  FEE_TXN = 0,
  VALIDATOR_APP_CALL_TXN,
  ASSET1_OUT_TXN,
  ASSET2_OUT_TXN,
  LIQUDITY_IN_TXN
}

/**
 * Get a quote for how many of assets 1 and 2 a deposit of liquidityIn is worth at this moment. This
 * does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.liquidityIn The quantity of the liquidity being deposited.
 */
export function getBurnLiquidityQuote({
  pool,
  reserves,
  liquidityIn
}: {
  pool: PoolInfo;
  reserves: PoolReserves;
  liquidityIn: number | bigint;
}): BurnQuote {
  const liquidityIn_bigInt = BigInt(liquidityIn);

  const asset1Out =
    reserves.issuedLiquidity &&
    (liquidityIn_bigInt * reserves.asset1) / reserves.issuedLiquidity;
  const asset2Out =
    reserves.issuedLiquidity &&
    (liquidityIn_bigInt * reserves.asset2) / reserves.issuedLiquidity;

  return {
    round: reserves.round,
    liquidityID: pool.liquidityTokenID!,
    liquidityIn: liquidityIn_bigInt,
    asset1ID: pool.asset1ID,
    asset1Out,
    asset2ID: pool.asset2ID,
    asset2Out
  };
}

const BURN_ENCODED = Uint8Array.from([98, 117, 114, 110]); // 'burn'

export const BURN_PROCESS_TXN_COUNT = 5;

export async function generateBurnTxns({
  client,
  pool,
  liquidityIn,
  asset1Out,
  asset2Out,
  slippage,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  liquidityIn: number | bigint;
  asset1Out: number | bigint;
  asset2Out: number | bigint;
  slippage: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: pool.addr,
    appIndex: pool.validatorAppID,
    appArgs: [BURN_ENCODED],
    accounts: [initiatorAddr],
    foreignAssets:
      pool.asset2ID == ALGO_ASSET_ID
        ? [pool.asset1ID, pool.liquidityTokenID as number]
        : [pool.asset1ID, pool.asset2ID, pool.liquidityTokenID as number],
    suggestedParams
  });

  const asset1OutAmount = applySlippageToAmount("negative", slippage, asset1Out);

  const asset1OutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: pool.addr,
    to: initiatorAddr,
    assetIndex: pool.asset1ID,
    amount: asset1OutAmount,
    suggestedParams
  });

  const asset2OutAmount = applySlippageToAmount("negative", slippage, asset2Out);
  let asset2OutTxn;

  if (pool.asset2ID === ALGO_ASSET_ID) {
    asset2OutTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      amount: asset2OutAmount,
      suggestedParams
    });
  } else {
    asset2OutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      assetIndex: pool.asset2ID,
      amount: asset2OutAmount,
      suggestedParams
    });
  }

  const liquidityInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    assetIndex: pool.liquidityTokenID as number,
    amount: liquidityIn,
    suggestedParams
  });

  let txnFees = validatorAppCallTxn.fee + asset1OutTxn.fee + asset2OutTxn.fee;

  const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    amount: txnFees,
    note: DEFAULT_FEE_TXN_NOTE,
    suggestedParams
  });

  txnFees += liquidityInTxn.fee + feeTxn.fee;

  const txGroup = algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    asset1OutTxn,
    asset2OutTxn,
    liquidityInTxn
  ]);

  return [
    {txn: txGroup[BurnTxnIndices.FEE_TXN], signers: [initiatorAddr]},
    {txn: txGroup[BurnTxnIndices.VALIDATOR_APP_CALL_TXN], signers: [pool.addr]},
    {txn: txGroup[BurnTxnIndices.ASSET1_OUT_TXN], signers: [pool.addr]},
    {txn: txGroup[BurnTxnIndices.ASSET2_OUT_TXN], signers: [pool.addr]},
    {txn: txGroup[BurnTxnIndices.LIQUDITY_IN_TXN], signers: [initiatorAddr]}
  ];
}

export async function signBurnTxns({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: PoolInfo;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  const [signedFeeTxn, signedLiquidityInTxn] = await initiatorSigner([txGroup]);
  const lsig = algosdk.makeLogicSig(pool.program);

  const signedTxns = txGroup.map((txDetail, index) => {
    if (index === BurnTxnIndices.FEE_TXN) {
      return signedFeeTxn;
    }
    if (index === BurnTxnIndices.LIQUDITY_IN_TXN) {
      return signedLiquidityInTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txDetail.txn, lsig);

    return blob;
  });

  return signedTxns;
}

/**
 * Execute a burn operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.liquidityIn The quantity of liquidity tokens being deposited.
 * @param params.asset1Out.amount The quantity of the first asset being withdrawn.
 * @param params.asset1Out.slippage The maximum acceptable slippage rate for asset1. Should be an
 *   integer between 0 and 100 and acts as a percentage of params.asset1Out.amount.
 * @param params.asset2Out.amount The quantity of the second asset being withdrawn.
 * @param params.asset2Out.slippage The maximum acceptable slippage rate for asset2. Should be an
 *   integer between 0 and 100 and acts as a percentage of params.asset2Out.amount.
 * @param params.initiatorAddr The address of the account performing the burn operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function burnLiquidity({
  client,
  pool,
  txGroup,
  signedTxns,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
  initiatorAddr: string;
}): Promise<BurnExecution> {
  const asset1Out = txGroup[BurnTxnIndices.ASSET1_OUT_TXN].txn.amount;
  const asset2Out = txGroup[BurnTxnIndices.ASSET2_OUT_TXN].txn.amount;
  const liquidityIn = txGroup[BurnTxnIndices.LIQUDITY_IN_TXN].txn.amount;

  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  const [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);

  const excessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let excessAmountDeltaAsset1 = excessAssets.excessAsset1 - prevExcessAssets.excessAsset1;

  if (excessAmountDeltaAsset1 < 0n) {
    excessAmountDeltaAsset1 = 0n;
  }

  let excessAmountDeltaAsset2 = excessAssets.excessAsset2 - prevExcessAssets.excessAsset2;

  if (excessAmountDeltaAsset2 < 0n) {
    excessAmountDeltaAsset2 = 0n;
  }

  return {
    round: confirmedRound,
    fees: sumUpTxnFees(txGroup),
    asset1ID: pool.asset1ID,
    asset1Out: BigInt(asset1Out) + excessAmountDeltaAsset1,
    asset2ID: pool.asset2ID,
    asset2Out: BigInt(asset2Out) + excessAmountDeltaAsset2,
    liquidityID: pool.liquidityTokenID!,
    liquidityIn: BigInt(liquidityIn),
    excessAmounts: [
      {
        assetID: pool.asset1ID,
        excessAmountForBurning: excessAmountDeltaAsset1,
        totalExcessAmount: excessAssets.excessAsset1
      },
      {
        assetID: pool.asset2ID,
        excessAmountForBurning: excessAmountDeltaAsset2,
        totalExcessAmount: excessAssets.excessAsset2
      }
    ],
    txnID,
    groupID: getTxnGroupID(txGroup)
  };
}
