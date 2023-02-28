import algosdk, {Algodv2} from "algosdk";

import {
  applySlippageToAmount,
  convertFromBaseUnits,
  getTxnGroupID,
  sendAndWaitRawTransaction,
  sumUpTxnFees,
  roundNumber,
  encodeString
} from "../../util/util";
import {InitiatorSigner, SignerTransaction} from "../../util/commonTypes";
import TinymanError from "../../util/error/TinymanError";
import {DEFAULT_FEE_TXN_NOTE} from "../../util/constant";
import {ALGO_ASSET_ID} from "../../util/asset/assetConstants";
import {PoolReserves, PoolStatus, V1PoolInfo} from "../../util/pool/poolTypes";
import {getAccountExcessWithinPool} from "../../util/account/accountUtils";
import {
  DirectSwapQuote,
  GenerateSwapTxnsWithoutRouterParams,
  V1SwapExecution
} from "../types";
import {SwapType} from "../constants";
import {calculatePriceImpact, calculateSwapRate} from "../common/utils";
import OutputAmountExceedsAvailableLiquidityError from "../../util/error/OutputAmountExceedsAvailableLiquidityError";
import {AssetWithIdAndAmount} from "../../util/asset/assetModels";
import {tinymanJSSDKConfig} from "../../config";
import {CONTRACT_VERSION} from "../../contract/constants";

// FEE = %0.3 or 3/1000
const FEE_NUMERATOR = 3n;
const FEE_DENOMINATOR = 1000n;

enum SwapTxnGroupIndices {
  FEE_TXN_INDEX = 0,
  VALIDATOR_APP_CALL_TXN_INDEX,
  ASSET_IN_TXN_INDEX,
  ASSET_OUT_TXN_INDEX
}

async function signTxns({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: V1PoolInfo;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  const [signedFeeTxn, signedAssetInTxn] = await initiatorSigner([txGroup]);

  const signedTxns = txGroup.map((txDetail, index) => {
    if (index === SwapTxnGroupIndices.FEE_TXN_INDEX) {
      return signedFeeTxn;
    }
    if (index === SwapTxnGroupIndices.ASSET_IN_TXN_INDEX) {
      return signedAssetInTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txDetail.txn, pool.account.lsig);

    return blob;
  });

  return signedTxns;
}

async function generateTxns({
  client,
  pool,
  swapType,
  assetIn,
  assetOut,
  slippage,
  initiatorAddr
}: GenerateSwapTxnsWithoutRouterParams): Promise<SignerTransaction[]> {
  const poolAddress = pool.account.address();
  const poolAssets = [pool.asset1ID, pool.asset2ID];

  if (
    !poolAssets.includes(assetIn.id) ||
    !poolAssets.includes(assetOut.id) ||
    assetIn.id === assetOut.id
  ) {
    throw new TinymanError(
      {pool, assetIn, assetOut},
      `Input asset (#${assetIn.id}) and output asset (#${assetOut.id}) provided to generate transactions do not belong to the pool ${poolAddress}.`
    );
  }

  const suggestedParams = await client.getTransactionParams().do();
  const validatorAppCallArgs = [
    encodeString("swap"),
    swapType === SwapType.FixedInput ? encodeString("fi") : encodeString("fo")
  ];

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: poolAddress,
    appIndex: pool.validatorAppID!,
    appArgs: validatorAppCallArgs,
    accounts: [initiatorAddr],
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(CONTRACT_VERSION.V1_1),
    foreignAssets:
      pool.asset2ID == ALGO_ASSET_ID
        ? [pool.asset1ID, pool.poolTokenID as number]
        : [pool.asset1ID, pool.asset2ID, pool.poolTokenID as number],
    suggestedParams
  });

  const assetInAmount =
    swapType === SwapType.FixedOutput
      ? applySlippageToAmount("positive", slippage, assetIn.amount)
      : assetIn.amount;
  let assetInTxn: algosdk.Transaction;

  if (assetIn.id === ALGO_ASSET_ID) {
    assetInTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: poolAddress,
      amount: assetInAmount,
      suggestedParams
    });
  } else {
    assetInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: poolAddress,
      assetIndex: assetIn.id,
      amount: assetInAmount,
      suggestedParams
    });
  }

  const assetOutAmount =
    swapType === SwapType.FixedInput
      ? applySlippageToAmount("negative", slippage, assetOut.amount)
      : assetOut.amount;
  let assetOutTxn: algosdk.Transaction;

  if (assetOut.id === ALGO_ASSET_ID) {
    assetOutTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: poolAddress,
      to: initiatorAddr,
      amount: assetOutAmount,
      suggestedParams
    });
  } else {
    assetOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: poolAddress,
      to: initiatorAddr,
      assetIndex: assetOut.id,
      amount: assetOutAmount,
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

  const txGroup: algosdk.Transaction[] = algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    assetInTxn,
    assetOutTxn
  ]);

  return [
    {txn: txGroup[0], signers: [initiatorAddr]},
    {txn: txGroup[1], signers: [poolAddress]},
    {txn: txGroup[2], signers: [initiatorAddr]},
    {txn: txGroup[3], signers: [poolAddress]}
  ];
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
function getQuote(
  type: SwapType,
  pool: V1PoolInfo,
  reserves: PoolReserves,
  asset: AssetWithIdAndAmount,
  decimals: {assetIn: number; assetOut: number}
): DirectSwapQuote {
  let quote: DirectSwapQuote;

  if (type === SwapType.FixedInput) {
    quote = getFixedInputSwapQuote({pool, reserves, assetIn: asset, decimals});
  } else {
    quote = getFixedOutputSwapQuote({pool, reserves, assetOut: asset, decimals});
  }

  return quote;
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
  pool: V1PoolInfo;
  reserves: PoolReserves;
  assetIn: AssetWithIdAndAmount;
  decimals: {assetIn: number; assetOut: number};
}): DirectSwapQuote {
  if (pool.status !== PoolStatus.READY) {
    throw new TinymanError({pool, assetIn}, "Trying to swap on a non-existent pool");
  }

  const assetInAmount = BigInt(assetIn.amount);

  let assetOutID: number;
  let inputSupply: bigint;
  let outputSupply: bigint;

  if (assetIn.id === pool.asset1ID) {
    assetOutID = pool.asset2ID;
    inputSupply = reserves.asset1;
    outputSupply = reserves.asset2;
  } else if (assetIn.id === pool.asset2ID) {
    assetOutID = pool.asset1ID;
    inputSupply = reserves.asset2;
    outputSupply = reserves.asset1;
  } else {
    throw new TinymanError(
      {pool, assetIn},
      `Input asset (#${assetIn.id}) doesn't belong to the pool ${pool.account.address()}.`
    );
  }

  const swapFee = (assetInAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
  const assetInAmountMinusFee = assetInAmount - swapFee;
  const k = inputSupply * outputSupply;
  // k = (inputSupply + assetInAmountMinusFee) * (outputSupply - assetOutAmount)
  const assetOutAmount = outputSupply - k / (inputSupply + assetInAmountMinusFee);

  if (assetOutAmount > outputSupply) {
    throw new OutputAmountExceedsAvailableLiquidityError();
  }

  const assetDataForSwapUtils = {
    assetIn: {amount: assetInAmount, decimals: decimals.assetIn},
    assetOut: {amount: assetOutAmount, decimals: decimals.assetOut}
  };

  return {
    round: reserves.round,
    assetInID: assetIn.id,
    assetInAmount,
    assetOutID,
    assetOutAmount,
    swapFee: Number(swapFee),
    rate: calculateSwapRate(assetDataForSwapUtils),
    priceImpact: calculatePriceImpact({
      inputSupply,
      outputSupply,
      ...assetDataForSwapUtils
    })
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
async function executeFixedInputSwap({
  client,
  pool,
  signedTxns,
  assetIn,
  assetOut,
  initiatorAddr
}: {
  client: Algodv2;
  pool: V1PoolInfo;
  signedTxns: Uint8Array[];
  assetIn: AssetWithIdAndAmount;
  assetOut: AssetWithIdAndAmount;
  initiatorAddr: string;
}): Promise<Omit<V1SwapExecution, "fees" | "groupID">> {
  const prevExcessAssets = await getAccountExcessWithinPool({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);

  const excessAssets = await getAccountExcessWithinPool({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let prevExcessAmount: bigint;
  let excessAmount: bigint;

  if (assetOut.id === pool.asset1ID) {
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
    assetInID: assetIn.id,
    assetInAmount: BigInt(assetIn.amount),
    assetOutID: assetOut.id,
    assetOutAmount: BigInt(assetOut.amount) + excessAmountDelta,
    excessAmount: {
      assetID: assetOut.id,
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
  pool: V1PoolInfo;
  reserves: PoolReserves;
  assetOut: AssetWithIdAndAmount;
  decimals: {assetIn: number; assetOut: number};
}): DirectSwapQuote {
  if (pool.status !== PoolStatus.READY) {
    throw new TinymanError({pool, assetOut}, "Trying to swap on a non-existent pool");
  }

  const assetOutAmount = BigInt(assetOut.amount);

  let assetInID: number;
  let inputSupply: bigint;
  let outputSupply: bigint;

  if (assetOut.id === pool.asset1ID) {
    assetInID = pool.asset2ID;
    inputSupply = reserves.asset2;
    outputSupply = reserves.asset1;
  } else if (assetOut.id === pool.asset2ID) {
    assetInID = pool.asset1ID;
    inputSupply = reserves.asset1;
    outputSupply = reserves.asset2;
  } else {
    throw new TinymanError(
      {pool, assetOut},
      `Output asset (#${
        assetOut.id
      }) doesn't belong to the pool ${pool.account.address()}.`
    );
  }

  if (assetOutAmount > outputSupply) {
    throw new OutputAmountExceedsAvailableLiquidityError();
  }

  const k = inputSupply * outputSupply;
  // k = (inputSupply + assetInAmountMinusFee) * (outputSupply - assetOutAmount)
  const assetInAmountMinusFee = k / (outputSupply - assetOutAmount) - inputSupply;
  const assetInAmount =
    (assetInAmountMinusFee * FEE_DENOMINATOR) / (FEE_DENOMINATOR - FEE_NUMERATOR);
  const swapFee = assetInAmount - assetInAmountMinusFee;

  const rate =
    convertFromBaseUnits(decimals.assetOut, Number(assetOutAmount)) /
    convertFromBaseUnits(decimals.assetIn, Number(assetInAmount));

  const poolPrice =
    convertFromBaseUnits(decimals.assetOut, Number(outputSupply)) /
    convertFromBaseUnits(decimals.assetIn, Number(inputSupply));

  const priceImpact = roundNumber({decimalPlaces: 5}, Math.abs(rate / poolPrice - 1));

  return {
    round: reserves.round,
    assetInID,
    assetInAmount,
    assetOutID: assetOut.id,
    assetOutAmount,
    swapFee: Number(swapFee),
    rate,
    priceImpact
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
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
async function executeFixedOutputSwap({
  client,
  pool,
  signedTxns,
  assetIn,
  assetOut,
  initiatorAddr
}: {
  client: Algodv2;
  pool: V1PoolInfo;
  signedTxns: Uint8Array[];
  assetIn: AssetWithIdAndAmount;
  assetOut: AssetWithIdAndAmount;
  initiatorAddr: string;
}): Promise<Omit<V1SwapExecution, "fees" | "groupID">> {
  const prevExcessAssets = await getAccountExcessWithinPool({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);

  const excessAssets = await getAccountExcessWithinPool({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let prevExcessAmount: bigint;
  let excessAmount: bigint;

  if (assetIn.id === pool.asset1ID) {
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
    assetInID: assetIn.id,
    assetInAmount: BigInt(assetIn.amount) - excessAmountDelta,
    assetOutID: assetOut.id,
    assetOutAmount: BigInt(assetOut.amount),
    excessAmount: {
      assetID: assetIn.id,
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
async function execute({
  client,
  pool,
  swapType,
  txGroup,
  signedTxns,
  initiatorAddr
}: {
  client: Algodv2;
  pool: V1PoolInfo;
  swapType: SwapType;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
  initiatorAddr: string;
}): Promise<V1SwapExecution> {
  if (pool.status !== PoolStatus.READY) {
    throw new TinymanError(
      {pool, swapType, txGroup},
      "Trying to swap on a non-existent pool"
    );
  }

  try {
    const assetIn: AssetWithIdAndAmount = {
      id: txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX].txn.assetIndex || ALGO_ASSET_ID,
      amount: txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX].txn.amount
    };
    const assetOut: AssetWithIdAndAmount = {
      id:
        txGroup[SwapTxnGroupIndices.ASSET_OUT_TXN_INDEX].txn.assetIndex || ALGO_ASSET_ID,
      amount: txGroup[SwapTxnGroupIndices.ASSET_OUT_TXN_INDEX].txn.amount
    };
    let swapData: Omit<V1SwapExecution, "fees" | "groupID">;

    if (swapType === SwapType.FixedInput) {
      swapData = await executeFixedInputSwap({
        client,
        pool,
        signedTxns,
        assetIn,
        assetOut,
        initiatorAddr
      });
    } else {
      swapData = await executeFixedOutputSwap({
        client,
        pool,
        signedTxns,
        assetIn,
        assetOut,
        initiatorAddr
      });
    }

    return {...swapData, groupID: getTxnGroupID(txGroup), fees: sumUpTxnFees(txGroup)};
  } catch (error: any) {
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

export const SwapV1_1 = {
  getQuote,
  getFixedInputSwapQuote,
  getFixedOutputSwapQuote,
  generateTxns,
  signTxns,
  execute,
  executeFixedOutputSwap
};
