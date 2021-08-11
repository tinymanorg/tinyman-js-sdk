import algosdk, {Algodv2, Transaction} from "algosdk";

import {
  applySlippageToAmount,
  bufferToBase64,
  convertFromBaseUnits,
  getTxnGroupID,
  sendAndWaitRawTransaction,
  sumUpTxnFees,
  waitForTransaction
} from "./util";
import {PoolInfo, getPoolReserves, getAccountExcess} from "./pool";
import {InitiatorSigner} from "./common-types";
import {ALGO_ASSET_ID} from "./constant";

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

const SWAP_ENCODED = Uint8Array.from([115, 119, 97, 112]); // 'swap'
const FIXED_INPUT_ENCODED = Uint8Array.from([102, 105]); // 'fi'
const FIXED_OUTPUT_ENCODED = Uint8Array.from([102, 111]); // 'fo'

enum SwapTxnGroupIndices {
  FEE_TXN_INDEX = 0,
  VALIDATOR_APP_CALL_TXN_INDEX,
  ASSET_IN_TXN_INDEX,
  ASSET_OUT_TXN_INDEX
}

function doSwap({
  client,
  pool,
  signedTxns,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  signedTxns: Uint8Array[];
  initiatorSigner: InitiatorSigner;
}) {
  return sendAndWaitRawTransaction(client, signedTxns);
}

export async function signSwapTransactions({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: PoolInfo;
  txGroup: Transaction[];
  initiatorSigner: InitiatorSigner;
}) {
  const lsig = algosdk.makeLogicSig(pool.program);

  const [signedFeeTxn, signedAssetInTxn] = await initiatorSigner([
    txGroup[SwapTxnGroupIndices.FEE_TXN_INDEX],
    txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX]
  ]);

  const signedTxns = txGroup.map((txn, index) => {
    if (index === SwapTxnGroupIndices.FEE_TXN_INDEX) {
      return signedFeeTxn;
    }
    if (index === SwapTxnGroupIndices.ASSET_IN_TXN_INDEX) {
      return signedAssetInTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txn, lsig);

    return blob;
  });

  return signedTxns;
}

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
}) {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallArgs = [
    SWAP_ENCODED,
    swapType === SwapType.FixedInput ? FIXED_INPUT_ENCODED : FIXED_OUTPUT_ENCODED
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
    suggestedParams
  });

  const txGroup: algosdk.Transaction[] = algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    assetInTxn,
    assetOutTxn
  ]);

  return txGroup;
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
async function getFixedInputSwapQuote({
  client,
  pool,
  assetIn,
  decimals
}: {
  client: any;
  pool: PoolInfo;
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
  decimals: {
    assetIn: number;
    assetOut: number;
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

  const rate =
    convertFromBaseUnits(decimals.assetOut, Number(assetOutAmount)) /
    convertFromBaseUnits(decimals.assetIn, Number(assetInAmount));

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
 * @param params.initiatorAddr The address of the account performing the swap operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function fixedInputSwap({
  client,
  pool,
  signedTxns,
  assetIn,
  assetOut,
  initiatorAddr,
  initiatorSigner
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
  initiatorSigner: InitiatorSigner;
}): Promise<Omit<SwapExecution, "fees" | "groupID">> {
  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let {confirmedRound, txnID} = await doSwap({
    client,
    pool,
    signedTxns,
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
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetOut.amount The quantity of the output asset.
 */
async function getFixedOutputSwapQuote({
  client,
  pool,
  assetOut,
  decimals
}: {
  client: any;
  pool: PoolInfo;
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
  decimals: {
    assetIn: number;
    assetOut: number;
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

  const rate =
    convertFromBaseUnits(decimals.assetOut, Number(assetOutAmount)) /
    convertFromBaseUnits(decimals.assetIn, Number(assetInAmountPlusFee));

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
 *
 * @param type - Type of the swap
 * @param pool - Information for the pool.
 * @param asset.assetID - ID of the asset to be swapped
 * @param asset.amount - Amount of the asset to be swapped
 * @param decimals.assetIn - Decimals quantity for the input asset
 * @param decimals.assetOut - Decimals quantity for the output asset
 * @returns A promise for the Swap quote
 */
export function getSwapQuote(
  client: Algodv2,
  type: SwapType,
  pool: PoolInfo,
  asset: {
    assetID: number;
    amount: number | bigint;
  },
  decimals: {
    assetIn: number;
    assetOut: number;
  }
): Promise<SwapQuote> {
  let promise;

  if (type === "fixed-input") {
    promise = getFixedInputSwapQuote({
      client,
      pool,
      assetIn: asset,
      decimals
    });
  } else {
    promise = getFixedOutputSwapQuote({
      client,
      pool,
      assetOut: asset,
      decimals
    });
  }

  return promise;
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
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function fixedOutputSwap({
  client,
  pool,
  signedTxns,
  assetIn,
  assetOut,
  initiatorAddr,
  initiatorSigner
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
  initiatorSigner: InitiatorSigner;
}): Promise<Omit<SwapExecution, "fees" | "groupID">> {
  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let {confirmedRound, txnID} = await doSwap({
    client,
    signedTxns,
    pool,
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
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function issueSwap({
  client,
  pool,
  swapType,
  txGroup,
  signedTxns,
  assetInID,
  assetOutID,
  initiatorAddr,
  initiatorSigner
}: {
  client: Algodv2;
  pool: PoolInfo;
  swapType: SwapType;
  txGroup: Transaction[];
  signedTxns: Uint8Array[];
  assetInID: number;
  assetOutID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<SwapExecution> {
  const assetIn = {
    assetID: assetInID,
    amount: txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX].amount
  };
  const assetOut = {
    assetID: assetOutID,
    amount: txGroup[SwapTxnGroupIndices.ASSET_OUT_TXN_INDEX].amount
  };
  let swapData: Omit<SwapExecution, "fees" | "groupID">;

  if (swapType === SwapType.FixedInput) {
    swapData = await fixedInputSwap({
      client,
      pool,
      signedTxns,
      assetIn,
      assetOut,
      initiatorAddr,
      initiatorSigner
    });
  } else {
    swapData = await fixedOutputSwap({
      client,
      pool,
      signedTxns,
      assetIn,
      assetOut,
      initiatorAddr,
      initiatorSigner
    });
  }

  return {...swapData, groupID: getTxnGroupID(txGroup), fees: sumUpTxnFees(txGroup)};
}
