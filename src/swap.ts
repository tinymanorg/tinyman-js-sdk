import algosdk, {Algodv2} from "algosdk";

import {
  applySlippageToAmount,
  convertFromBaseUnits,
  getTxnGroupID,
  sendAndWaitRawTransaction,
  sumUpTxnFees,
  roundNumber,
  encodeString
} from "./util";
import {PoolInfo, getAccountExcess, PoolReserves} from "./pool";
import {InitiatorSigner, SignerTransaction} from "./common-types";
import TinymanError from "./error/TinymanError";
import {DEFAULT_FEE_TXN_NOTE} from "./constant";
import {ALGO_ASSET_ID} from "./asset/assetConstants";

// FEE = %0.3 or 3/1000
const FEE_NUMERATOR = 3n;
const FEE_DENOMINATOR = 1000n;

export enum SwapType {
  FixedInput = "fixed-input",
  FixedOutput = "fixed-output"
}

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
  /** The price impact of the swap */
  priceImpact: number;
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
  excessAmount: {
    /** Asset ID for which the excess amount can be redeemed with */
    assetID: number;
    /** Excess amount for the current swap */
    excessAmountForSwap: bigint;
    /** Total excess amount accumulated for the pool asset */
    totalExcessAmount: bigint;
  };
  /** The group ID for the transaction group. */
  groupID: string;
}

enum SwapTxnGroupIndices {
  FEE_TXN_INDEX = 0,
  VALIDATOR_APP_CALL_TXN_INDEX,
  ASSET_IN_TXN_INDEX,
  ASSET_OUT_TXN_INDEX
}

export async function signSwapTransactions({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: PoolInfo;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  const lsig = algosdk.makeLogicSig(pool.program);

  const [signedFeeTxn, signedAssetInTxn] = await initiatorSigner([txGroup]);

  const signedTxns = txGroup.map((txDetail, index) => {
    if (index === SwapTxnGroupIndices.FEE_TXN_INDEX) {
      return signedFeeTxn;
    }
    if (index === SwapTxnGroupIndices.ASSET_IN_TXN_INDEX) {
      return signedAssetInTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txDetail.txn, lsig);

    return blob;
  });

  return signedTxns;
}

export const SWAP_PROCESS_TXN_COUNT = 4;

export async function generateSwapTransactions({
  client,
  pool,
  swapType,
  assetIn,
  assetOut,
  slippage,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  swapType: SwapType;
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
  slippage: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallArgs = [
    encodeString("swap"),
    swapType === SwapType.FixedInput ? encodeString("fi") : encodeString("fo")
  ];

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: pool.addr,
    appIndex: pool.validatorAppID!,
    appArgs: validatorAppCallArgs,
    accounts: [initiatorAddr],
    foreignAssets:
      pool.asset2ID == ALGO_ASSET_ID
        ? [pool.asset1ID, <number>pool.liquidityTokenID]
        : [pool.asset1ID, pool.asset2ID, <number>pool.liquidityTokenID],
    suggestedParams
  });

  const assetInAmount =
    swapType === SwapType.FixedOutput
      ? applySlippageToAmount("positive", slippage, assetIn.amount)
      : assetIn.amount;
  let assetInTxn: algosdk.Transaction;

  if (assetIn.assetID === ALGO_ASSET_ID) {
    assetInTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: pool.addr,
      amount: assetInAmount,
      suggestedParams
    });
  } else {
    assetInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: pool.addr,
      assetIndex: assetIn.assetID,
      amount: assetInAmount,
      suggestedParams
    });
  }

  const assetOutAmount =
    swapType === SwapType.FixedInput
      ? applySlippageToAmount("negative", slippage, assetOut.amount)
      : assetOut.amount;
  let assetOutTxn: algosdk.Transaction;

  if (assetOut.assetID === ALGO_ASSET_ID) {
    assetOutTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      amount: assetOutAmount,
      suggestedParams
    });
  } else {
    assetOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: pool.addr,
      to: initiatorAddr,
      assetIndex: assetOut.assetID,
      amount: assetOutAmount,
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

  const txGroup: algosdk.Transaction[] = algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    assetInTxn,
    assetOutTxn
  ]);

  return [
    {txn: txGroup[0], signers: [initiatorAddr]},
    {txn: txGroup[1], signers: [pool.addr]},
    {txn: txGroup[2], signers: [initiatorAddr]},
    {txn: txGroup[3], signers: [pool.addr]}
  ];
}

/**
 * Get a quote for a fixed input swap This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool Reserves.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetIn.amount The quantity of the input asset.
 */
function getFixedInputSwapQuote({
  pool,
  reserves,
  assetIn,
  decimals
}: {
  pool: PoolInfo;
  reserves: PoolReserves;
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
  decimals: {
    assetIn: number;
    assetOut: number;
  };
}): SwapQuote {
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

  const rate =
    convertFromBaseUnits(decimals.assetOut, Number(assetOutAmount)) /
    convertFromBaseUnits(decimals.assetIn, Number(assetInAmount));

  const swapPrice = 1 / rate;

  const poolPrice =
    convertFromBaseUnits(decimals.assetIn, Number(inputSupply)) /
    convertFromBaseUnits(decimals.assetOut, Number(outputSupply));

  const priceImpact = roundNumber(
    {decimalPlaces: 5},
    Math.abs(swapPrice / poolPrice - 1)
  );

  return {
    round: reserves.round,
    assetInID: assetIn.assetID,
    assetInAmount,
    assetOutID,
    assetOutAmount,
    swapFee: Number(swapFee),
    rate,
    priceImpact
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
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
async function fixedInputSwap({
  client,
  pool,
  signedTxns,
  assetIn,
  assetOut,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  signedTxns: Uint8Array[];
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
  initiatorAddr: string;
}): Promise<Omit<SwapExecution, "fees" | "groupID">> {
  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);

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

  return {
    round: confirmedRound,
    assetInID: assetIn.assetID,
    assetInAmount: BigInt(assetIn.amount),
    assetOutID: assetOut.assetID,
    assetOutAmount: BigInt(assetOut.amount) + excessAmountDelta,
    excessAmount: {
      assetID: assetOut.assetID,
      excessAmountForSwap: excessAmountDelta,
      totalExcessAmount: excessAmount
    },
    txnID
  };
}
/**
 * Get a quote for a fixed output swap This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool Reserves
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetOut.amount The quantity of the output asset.
 */
function getFixedOutputSwapQuote({
  pool,
  reserves,
  assetOut,
  decimals
}: {
  pool: PoolInfo;
  reserves: PoolReserves;
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
  decimals: {
    assetIn: number;
    assetOut: number;
  };
}): SwapQuote {
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

  const rate =
    convertFromBaseUnits(decimals.assetOut, Number(assetOutAmount)) /
    convertFromBaseUnits(decimals.assetIn, Number(assetInAmountPlusFee));

  const swapPrice = 1 / rate;

  const poolPrice =
    convertFromBaseUnits(decimals.assetIn, Number(inputSupply)) /
    convertFromBaseUnits(decimals.assetOut, Number(outputSupply));

  const priceImpact = roundNumber(
    {decimalPlaces: 5},
    Math.abs(swapPrice / poolPrice - 1)
  );

  return {
    round: reserves.round,
    assetInID,
    assetInAmount: assetInAmountPlusFee,
    assetOutID: assetOut.assetID,
    assetOutAmount,
    swapFee: Number(swapFee),
    rate,
    priceImpact
  };
}

/**
 *
 * @param type - Type of the swap
 * @param pool - Information for the pool.
 * @param reserves - Pool reserves.
 * @param asset.assetID - ID of the asset to be swapped
 * @param asset.amount - Amount of the asset to be swapped
 * @param decimals.assetIn - Decimals quantity for the input asset
 * @param decimals.assetOut - Decimals quantity for the output asset
 * @returns A promise for the Swap quote
 */
export function getSwapQuote(
  type: SwapType,
  pool: PoolInfo,
  reserves: PoolReserves,
  asset: {
    assetID: number;
    amount: number | bigint;
  },
  decimals: {
    assetIn: number;
    assetOut: number;
  }
): SwapQuote {
  let quote;

  if (type === "fixed-input") {
    quote = getFixedInputSwapQuote({
      pool,
      reserves,
      assetIn: asset,
      decimals
    });
  } else {
    quote = getFixedOutputSwapQuote({
      pool,
      reserves,
      assetOut: asset,
      decimals
    });
  }

  return quote;
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
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
async function fixedOutputSwap({
  client,
  pool,
  signedTxns,
  assetIn,
  assetOut,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  signedTxns: Uint8Array[];
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
  initiatorAddr: string;
}): Promise<Omit<SwapExecution, "fees" | "groupID">> {
  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);

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

  return {
    round: confirmedRound,
    assetInID: assetIn.assetID,
    assetInAmount: BigInt(assetIn.amount) - excessAmountDelta,
    assetOutID: assetOut.assetID,
    assetOutAmount: BigInt(assetOut.amount),
    excessAmount: {
      assetID: assetIn.assetID,
      excessAmountForSwap: excessAmountDelta,
      totalExcessAmount: excessAmount
    },
    txnID
  };
}

/**
 * Execute a swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.swapType Type of the swap.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The desired quantity of the input asset.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The quantity of the output asset.
 * @param params.slippage The maximum acceptable slippage rate.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
export async function issueSwap({
  client,
  pool,
  swapType,
  txGroup,
  signedTxns,
  initiatorAddr
}: {
  client: Algodv2;
  pool: PoolInfo;
  swapType: SwapType;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
  initiatorAddr: string;
}): Promise<SwapExecution> {
  try {
    const assetIn = {
      assetID:
        txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX].txn.assetIndex || ALGO_ASSET_ID,
      amount: txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX].txn.amount
    };
    const assetOut = {
      assetID:
        txGroup[SwapTxnGroupIndices.ASSET_OUT_TXN_INDEX].txn.assetIndex || ALGO_ASSET_ID,
      amount: txGroup[SwapTxnGroupIndices.ASSET_OUT_TXN_INDEX].txn.amount
    };
    let swapData: Omit<SwapExecution, "fees" | "groupID">;

    if (swapType === SwapType.FixedInput) {
      swapData = await fixedInputSwap({
        client,
        pool,
        signedTxns,
        assetIn,
        assetOut,
        initiatorAddr
      });
    } else {
      swapData = await fixedOutputSwap({
        client,
        pool,
        signedTxns,
        assetIn,
        assetOut,
        initiatorAddr
      });
    }

    return {...swapData, groupID: getTxnGroupID(txGroup), fees: sumUpTxnFees(txGroup)};
  } catch (error) {
    const parsedError = new TinymanError(
      error,
      "We encountered something unexpected while swapping. Try again later."
    );

    if (parsedError.type === "SlippageTolerance") {
      parsedError.setMessage(
        "The swap failed due to too much slippage in the price. Please adjust the slippage tolerance and try again."
      );
    }

    throw parsedError;
  }
}
