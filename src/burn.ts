import algosdk from "algosdk";

import {waitForTransaction} from "./util";
import {PoolInfo, getPoolReserves, getAccountExcess, PoolReserves} from "./pool";
import {redeemExcessAsset} from "./redeem";
import {InitiatorSigner} from "./common-types";

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

  const asset1Out = (liquidityIn_bigInt * reserves.asset1) / reserves.issuedLiquidity;
  const asset2Out = (liquidityIn_bigInt * reserves.asset2) / reserves.issuedLiquidity;

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

async function doBurn({
  client,
  pool,
  liquidityIn,
  asset1Out,
  asset2Out,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  liquidityIn: number | bigint;
  asset1Out: number | bigint;
  asset2Out: number | bigint;
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
    appArgs: [BURN_ENCODED],
    accounts: [initiatorAddr],
    suggestedParams
  });

  const asset1OutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: pool.addr,
    to: initiatorAddr,
    assetIndex: pool.asset1ID,
    amount: asset1Out,
    suggestedParams
  });

  let asset2OutTxn;

  if (pool.asset1ID === 0) {
    asset2OutTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      amount: asset2Out,
      suggestedParams
    });
  } else {
    asset2OutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      assetIndex: pool.asset2ID,
      amount: asset1Out,
      suggestedParams
    });
  }

  const liquidityInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    assetIndex: <number>pool.liquidityTokenID,
    amount: liquidityIn,
    suggestedParams
  });

  let txnFees = validatorAppCallTxn.fee + asset1OutTxn.fee + asset2OutTxn.fee;

  const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    amount: txnFees,
    suggestedParams
  });

  txnFees += liquidityInTxn.fee + feeTxn.fee;

  const txGroup: any[] = algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    asset1OutTxn,
    asset2OutTxn,
    liquidityInTxn
  ]);

  const lsig = algosdk.makeLogicSig(pool.program);
  const [signedFeeTxn, signedLiquidityInTxn] = await initiatorSigner([
    txGroup[0],
    txGroup[4]
  ]);

  const signedTxns = txGroup.map((txn, index) => {
    if (index === 0) {
      return signedFeeTxn;
    }
    if (index === 4) {
      return signedLiquidityInTxn;
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
 * @param params.redeemExcess If true, any excess amount of the output assets created by this burn
 *   will be redeemed after the burn executes.
 * @param params.initiatorAddr The address of the account performing the burn operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function burnLiquidity({
  client,
  pool,
  liquidityIn,
  asset1Out,
  asset2Out,
  redeemExcess,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  liquidityIn: number | bigint;
  asset1Out: {
    amount: number | bigint;
    slippage: number;
  };
  asset2Out: {
    amount: number | bigint;
    slippage: number;
  };
  redeemExcess: boolean;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<BurnExecution> {
  if (
    !Number.isInteger(asset1Out.slippage) ||
    asset1Out.slippage < 0 ||
    asset1Out.slippage > 100
  ) {
    throw new Error(
      `Invalid slippage value for asset 1. Must be an integer between 0 and 100, got ${asset1Out.slippage}`
    );
  }

  if (
    !Number.isInteger(asset2Out.slippage) ||
    asset2Out.slippage < 0 ||
    asset2Out.slippage > 100
  ) {
    throw new Error(
      `Invalid slippage value for asset 2. Must be an integer between 0 and 100, got ${asset2Out.slippage}`
    );
  }

  // apply slippage to asset 1 out amount
  const asset1OutAmount =
    (BigInt(asset1Out.amount) * BigInt(100 - asset1Out.slippage)) / 100n;

  // apply slippage to asset 2 out amount
  const asset2OutAmount =
    (BigInt(asset2Out.amount) * BigInt(100 - asset2Out.slippage)) / 100n;

  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let {fees, confirmedRound} = await doBurn({
    client,
    pool,
    liquidityIn,
    asset1Out: asset1OutAmount,
    asset2Out: asset2OutAmount,
    initiatorAddr,
    initiatorSigner
  });

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

  if (redeemExcess) {
    if (excessAmountDeltaAsset1 > 0n) {
      const asset1RedeemOutput = await redeemExcessAsset({
        client,
        pool,
        assetID: pool.asset1ID,
        assetOut: excessAmountDeltaAsset1,
        initiatorAddr,
        initiatorSigner
      });

      fees += asset1RedeemOutput.fees;
    }

    if (excessAmountDeltaAsset2 > 0n) {
      const asset2RedeemOutput = await redeemExcessAsset({
        client,
        pool,
        assetID: pool.asset2ID,
        assetOut: excessAmountDeltaAsset2,
        initiatorAddr,
        initiatorSigner
      });

      fees += asset2RedeemOutput.fees;
    }
  }

  return {
    round: confirmedRound,
    fees,
    asset1ID: pool.asset1ID,
    asset1Out: asset1OutAmount + excessAmountDeltaAsset1,
    asset2ID: pool.asset2ID,
    asset2Out: asset2OutAmount + excessAmountDeltaAsset2,
    liquidityID: pool.liquidityTokenID!,
    liquidityIn: BigInt(liquidityIn)
  };
}
