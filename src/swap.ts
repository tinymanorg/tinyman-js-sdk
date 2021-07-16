import algosdk from "algosdk";

import {applySlippageToAmount, bufferToBase64, waitForTransaction} from "./util";
import {PoolInfo, getPoolReserves, getAccountExcess} from "./pool";
import {redeemExcessAsset} from "./redeem";
import {InitiatorSigner} from "./common-types";

// FEE = %0.3 or 3/1000
const FEE_NUMERATOR = 3n;
const FEE_DENOMINATOR = 1000n;

/** An object containing information about a swap quote. */
export interface SwapQuote {
  /** The round that this quote is based on. */
  round: number;
  /** The ID of the input asset in this quote. */
  assetInID: number;
  /** The quantity of the input asset in this quote. */
  assetInAmount: bigint;
  /** The ID of the output asset in this quote. */
  assetOutID: number;
  /** The quantity of the output asset in this quote. */
  assetOutAmount: bigint;
  /** The amount of fee that may be spent (in the currency of the fixed asset) for the swap  */
  swapFee: number;
  /** The final exchange rate for this swap expressed as  assetOutAmount / assetInAmount */
  rate: number;
}

/** An object containing information about a successfully executed swap. */
export interface SwapExecution {
  /** The round that the swap occurred in. */
  round: number;
  /**
   * The total amount of transaction fees that were spent (in microAlgos) to execute the swap and,
   * if applicable, redeem transactions.
   */
  fees: number;
  /** The ID of the swap's input asset. */
  assetInID: number;
  /** The amount of the swap's input asset. */
  assetInAmount: bigint;
  /** The ID of the swap's output asset. */
  assetOutID: number;
  /** The amount of the swap's output asset. */
  assetOutAmount: bigint;
  /** The ID of the transaction. */
  txnID: string;
  /** The group ID for the transaction group. */
  groupID: string;
}

const SWAP_ENCODED = Uint8Array.from([115, 119, 97, 112]); // 'swap'
const FIXED_INPUT_ENCODED = Uint8Array.from([102, 105]); // 'fi'
const FIXED_OUTPUT_ENCODED = Uint8Array.from([102, 111]); // 'fo'

async function doSwap({
  client,
  pool,
  swapType,
  assetIn,
  assetOut,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  swapType: "fixed input" | "fixed output";
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<{
  fees: number;
  confirmedRound: number;
  txnID: string;
  groupID: string;
}> {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallArgs = [
    SWAP_ENCODED,
    swapType === "fixed input" ? FIXED_INPUT_ENCODED : FIXED_OUTPUT_ENCODED
  ];

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: pool.addr,
    appIndex: pool.validatorAppID!,
    appArgs: validatorAppCallArgs,
    accounts: [initiatorAddr],
    foreignAssets:
      pool.asset2ID == 0
        ? [pool.asset1ID, <number>pool.liquidityTokenID]
        : [pool.asset1ID, pool.asset2ID, <number>pool.liquidityTokenID],
    suggestedParams
  });

  let assetInTxn: algosdk.Transaction;

  if (assetIn.assetID === 0) {
    assetInTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: pool.addr,
      amount: assetIn.amount,
      suggestedParams
    });
  } else {
    assetInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: pool.addr,
      assetIndex: assetIn.assetID,
      amount: assetIn.amount,
      suggestedParams
    });
  }

  let assetOutTxn: algosdk.Transaction;

  if (assetOut.assetID === 0) {
    assetOutTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      amount: assetOut.amount,
      suggestedParams
    });
  } else {
    assetOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      assetIndex: assetOut.assetID,
      amount: assetOut.amount,
      suggestedParams
    });
  }

  let txnFees = validatorAppCallTxn.fee + assetOutTxn.fee;

  const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    amount: txnFees,
    suggestedParams
  });

  txnFees += assetInTxn.fee + feeTxn.fee;

  const txGroup: algosdk.Transaction[] = algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    assetInTxn,
    assetOutTxn
  ]);

  const lsig = algosdk.makeLogicSig(pool.program);

  const [signedFeeTxn, signedAssetInTxn] = await initiatorSigner([
    txGroup[0],
    txGroup[2]
  ]);

  const signedTxns = txGroup.map((txn, index) => {
    if (index === 0) {
      return signedFeeTxn;
    }
    if (index === 2) {
      return signedAssetInTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txn, lsig);

    return blob;
  });

  const {txId} = await client.sendRawTransaction(signedTxns).do();

  const status = await waitForTransaction(client, txId);

  const confirmedRound: number = status["confirmed-round"];

  return {
    fees: txnFees,
    confirmedRound,
    groupID: bufferToBase64(txGroup[0].group),
    txnID: txId
  };
}

/**
 * Get a quote for a fixed input swap This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetIn.amount The quantity of the input asset.
 */
export async function getFixedInputSwapQuote({
  client,
  pool,
  assetIn
}: {
  client: any;
  pool: PoolInfo;
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
}): Promise<SwapQuote> {
  const reserves = await getPoolReserves(client, pool);

  const assetInAmount = BigInt(assetIn.amount);

  let assetOutID: number;
  let inputSupply: bigint;
  let outputSupply: bigint;

  if (assetIn.assetID === pool.asset1ID) {
    assetOutID = pool.asset2ID;
    inputSupply = reserves.asset1;
    outputSupply = reserves.asset2;
  } else {
    assetOutID = pool.asset1ID;
    inputSupply = reserves.asset2;
    outputSupply = reserves.asset1;
  }

  const swapFee = (assetInAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
  const assetInAmountMinusFee = assetInAmount - swapFee;
  const k = inputSupply * outputSupply;
  // k = (inputSupply + assetInAmountMinusFee) * (outputSupply - assetOutAmount)
  const assetOutAmount = outputSupply - k / (inputSupply + assetInAmountMinusFee);

  if (assetOutAmount > outputSupply) {
    throw new Error("Output amount exceeds available liquidity.");
  }

  const rate = Number(assetOutAmount) / Number(assetInAmount);

  return {
    round: reserves.round,
    assetInID: assetIn.assetID,
    assetInAmount,
    assetOutID,
    assetOutAmount,
    swapFee: Number(swapFee),
    rate
  };
}

/**
 * Execute a fixed input swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The quantity of the input asset.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The desired quantity of the output asset.
 * @param params.assetOut.slippage The maximum acceptable slippage rate. Should be a number between
 *   0 and 100 and acts as a percentage of params.assetOut.amount.
 * @param params.redeemExcess If true, any excess amount of the output asset created by this swap
 *   will be redeemed after the swap executes.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function fixedInputSwap({
  client,
  pool,
  assetIn,
  assetOut,
  redeemExcess,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
  assetOut: {
    assetID: number;
    amount: number | bigint;
    slippage: number;
  };
  redeemExcess: boolean;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<SwapExecution> {
  // apply slippage to asset out amount
  const assetOutAmount = applySlippageToAmount(
    "negative",
    assetOut.slippage,
    assetOut.amount
  );

  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let {fees, confirmedRound, groupID, txnID} = await doSwap({
    client,
    pool,
    swapType: "fixed input",
    assetIn,
    assetOut: {
      assetID: assetOut.assetID,
      amount: assetOutAmount
    },
    initiatorAddr,
    initiatorSigner
  });

  const excessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let prevExcessAmount: bigint;
  let excessAmount: bigint;

  if (assetOut.assetID === pool.asset1ID) {
    prevExcessAmount = prevExcessAssets.excessAsset1;
    excessAmount = excessAssets.excessAsset1;
  } else {
    prevExcessAmount = prevExcessAssets.excessAsset2;
    excessAmount = excessAssets.excessAsset2;
  }

  let excessAmountDelta = excessAmount - prevExcessAmount;

  if (excessAmountDelta < 0n) {
    excessAmountDelta = 0n;
  }

  if (redeemExcess && excessAmountDelta > 0n) {
    const redeemOutput = await redeemExcessAsset({
      client,
      pool,
      assetID: assetOut.assetID,
      assetOut: excessAmount,
      initiatorAddr,
      initiatorSigner
    });

    fees += redeemOutput.fees;
  }

  return {
    round: confirmedRound,
    fees,
    assetInID: assetIn.assetID,
    assetInAmount: BigInt(assetIn.amount),
    assetOutID: assetOut.assetID,
    assetOutAmount: assetOutAmount + excessAmountDelta,
    groupID,
    txnID
  };
}

/**
 * Get a quote for a fixed output swap This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetOut.amount The quantity of the output asset.
 */
export async function getFixedOutputSwapQuote({
  client,
  pool,
  assetOut
}: {
  client: any;
  pool: PoolInfo;
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
}): Promise<SwapQuote> {
  const reserves = await getPoolReserves(client, pool);

  const assetOutAmount = BigInt(assetOut.amount);

  let assetInID: number;
  let inputSupply: bigint;
  let outputSupply: bigint;

  if (assetOut.assetID === pool.asset1ID) {
    assetInID = pool.asset2ID;
    inputSupply = reserves.asset2;
    outputSupply = reserves.asset1;
  } else {
    assetInID = pool.asset1ID;
    inputSupply = reserves.asset1;
    outputSupply = reserves.asset2;
  }

  if (assetOutAmount > outputSupply) {
    throw new Error("Output amount exceeds available liquidity.");
  }

  const k = inputSupply * outputSupply;
  // k = (inputSupply + assetInAmount) * (outputSupply - assetOutAmount)
  const assetInAmount = k / (outputSupply - assetOutAmount) - inputSupply;
  const swapFee = (assetInAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
  const assetInAmountPlusFee = assetInAmount + swapFee;
  const rate = Number(assetOutAmount) / Number(assetInAmountPlusFee);

  return {
    round: reserves.round,
    assetInID,
    assetInAmount: assetInAmountPlusFee,
    assetOutID: assetOut.assetID,
    assetOutAmount,
    swapFee: Number(swapFee),
    rate
  };
}

/**
 * Execute a fixed output swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The desired quantity of the input asset.
 * @param params.assetIn.slippage The maximum acceptable slippage rate. Should be a number greater
 *   or equal to 0 and acts as a percentage of params.assetIn.amount. NOTE: the initiating account
 *   must posses at least params.assetIn.amount * (100 + params.assetIn.slippage) / 100 units of the
 *   input asset in order for this transaction to be valid.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The quantity of the output asset.
 * @param params.redeemExcess If true, any excess amount of the input asset created by this swap
 *   will be redeemed after the swap executes.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function fixedOutputSwap({
  client,
  pool,
  assetIn,
  assetOut,
  redeemExcess,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  assetIn: {
    assetID: number;
    amount: number | bigint;
    slippage: number;
  };
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
  redeemExcess: boolean;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<SwapExecution> {
  // apply slippage to asset in amount
  const assetInAmount = applySlippageToAmount(
    "positive",
    assetIn.slippage,
    assetIn.amount
  );

  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let {fees, confirmedRound, groupID, txnID} = await doSwap({
    client,
    pool,
    swapType: "fixed output",
    assetIn: {
      assetID: assetIn.assetID,
      amount: assetInAmount
    },
    assetOut,
    initiatorAddr,
    initiatorSigner
  });

  const excessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let prevExcessAmount: bigint;
  let excessAmount: bigint;

  if (assetIn.assetID === pool.asset1ID) {
    prevExcessAmount = prevExcessAssets.excessAsset1;
    excessAmount = excessAssets.excessAsset1;
  } else {
    prevExcessAmount = prevExcessAssets.excessAsset2;
    excessAmount = excessAssets.excessAsset2;
  }

  let excessAmountDelta = excessAmount - prevExcessAmount;

  if (excessAmountDelta < 0n) {
    excessAmountDelta = 0n;
  }

  if (redeemExcess && excessAmountDelta > 0n) {
    const redeemOutput = await redeemExcessAsset({
      client,
      pool,
      assetID: assetIn.assetID,
      assetOut: excessAmount,
      initiatorAddr,
      initiatorSigner
    });

    fees += redeemOutput.fees;
  }

  return {
    round: confirmedRound,
    fees,
    assetInID: assetIn.assetID,
    assetInAmount: assetInAmount - excessAmountDelta,
    assetOutID: assetOut.assetID,
    assetOutAmount: BigInt(assetOut.amount),
    groupID,
    txnID
  };
}
