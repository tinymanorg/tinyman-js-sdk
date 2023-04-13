import algosdk, {Algodv2, Transaction} from "algosdk";

import {
  applySlippageToAmount,
  convertFromBaseUnits,
  sendAndWaitRawTransaction
} from "../../util/util";
import {
  InitiatorSigner,
  SignerTransaction,
  SupportedNetwork
} from "../../util/commonTypes";
import TinymanError from "../../util/error/TinymanError";
import {V2PoolInfo} from "../../util/pool/poolTypes";
import {
  DirectSwapQuote,
  GenerateSwapTxnsParams,
  SwapQuote,
  SwapQuoteType,
  V2SwapExecution
} from "../types";
import {SwapType} from "../constants";
import {
  V2_SWAP_APP_CALL_ARG_ENCODED,
  V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED,
  V2SwapTxnGroupIndices
} from "./constants";
import {isAlgo} from "../../util/asset/assetUtils";
import {
  calculatePriceImpact,
  getAssetInFromSwapQuote,
  getAssetOutFromSwapQuote,
  getBestQuote,
  isSwapQuoteErrorCausedByAmount
} from "../common/utils";
import {getAppCallInnerAssetData} from "../../util/transaction/transactionUtils";
import {AssetWithIdAndAmount, AssetWithIdAndDecimals} from "../../util/asset/assetModels";
import {tinymanJSSDKConfig} from "../../config";
import {CONTRACT_VERSION} from "../../contract/constants";
import {generateSwapRouterTxns, getSwapRoute} from "./router/swap-router";
import {poolUtils} from "../../util/pool";
import SwapQuoteError, {SwapQuoteErrorType} from "../../util/error/SwapQuoteError";
import {getSwapAppCallFeeAmount, isSwapAssetInAmountLow} from "./util";

async function generateTxns(
  params: GenerateSwapTxnsParams
): Promise<SignerTransaction[]> {
  if (params.quote.type === SwapQuoteType.Router) {
    return generateSwapRouterTxns({...params, route: params.quote.data.route});
  }

  const {client, initiatorAddr, slippage, swapType, quote} = params;

  const {
    data: {pool, quote: swapQuote}
  } = quote;
  const {assetInID, assetOutID} = swapQuote;

  const poolAddress = pool.account.address();
  const poolAssets = [pool.asset1ID, pool.asset2ID];

  if (
    !poolAssets.includes(assetInID) ||
    !poolAssets.includes(assetOutID) ||
    assetInID === assetOutID
  ) {
    throw new TinymanError(
      {pool, quote},
      `Input asset (#${assetInID}) and output asset (#${assetOutID}) provided to generate transactions do not belong to the pool ${poolAddress}.`
    );
  }

  const suggestedParams = await client.getTransactionParams().do();
  const isAssetInAlgo = isAlgo(assetInID);
  const assetInAmount =
    swapType === SwapType.FixedInput
      ? swapQuote.assetInAmount
      : applySlippageToAmount("positive", slippage, swapQuote.assetInAmount);
  const assetOutAmount =
    swapType === SwapType.FixedOutput
      ? swapQuote.assetOutAmount
      : applySlippageToAmount("negative", slippage, swapQuote.assetOutAmount);

  /**
   * If the input asset is Algo, a payment txn, otherwise an asset transfer txn is required
   */
  const inputTxn = isAssetInAlgo
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: assetInAmount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: assetInAmount,
        assetIndex: assetInID,
        suggestedParams
      });

  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: pool.validatorAppID,
    appArgs: [
      V2_SWAP_APP_CALL_ARG_ENCODED,
      V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED[swapType],
      algosdk.encodeUint64(assetOutAmount)
    ],
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(CONTRACT_VERSION.V2),
    accounts: [poolAddress],
    foreignAssets: [pool.asset1ID, pool.asset2ID],
    suggestedParams
  });

  appCallTxn.fee = getSwapAppCallFeeAmount(swapType);

  let txns: Transaction[] = [];

  txns[V2SwapTxnGroupIndices.INPUT_TXN] = inputTxn;
  txns[V2SwapTxnGroupIndices.APP_CALL_TXN] = appCallTxn;

  const txGroup = algosdk.assignGroupID(txns);

  return [
    {
      txn: txGroup[V2SwapTxnGroupIndices.INPUT_TXN],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[V2SwapTxnGroupIndices.APP_CALL_TXN],
      signers: [initiatorAddr]
    }
  ];
}

function signTxns({
  txGroup,
  initiatorSigner
}: {
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  return initiatorSigner([txGroup]);
}

/**
 * Executes a swap with the desired quantities.
 */
async function execute({
  client,
  quote,
  txGroup,
  signedTxns
}: {
  client: Algodv2;
  quote: SwapQuote;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
}): Promise<V2SwapExecution> {
  const [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);
  const assetOutId = getAssetOutFromSwapQuote(quote).id;
  const assetIn = getAssetInFromSwapQuote(quote);
  let innerTxnAssetData: AssetWithIdAndAmount[] | undefined;

  try {
    innerTxnAssetData = await getAppCallInnerAssetData(client, txGroup);
  } catch (_error) {
    // We can ignore this error since the main execution was successful
  }

  /**
   * If the swap type if Fixed Output, usually there will be a difference between
   * input amount and the actual used input amount. The change will be returned to the user
   * using an inner txn.
   * If it is `undefined`, it means that the input amount was exactly the amount used,
   * or the swap type is fixed input.
   */
  const assetInChangeAmount = innerTxnAssetData?.find(
    ({id}) => id === assetIn.id
  )?.amount;
  const assetOut = innerTxnAssetData?.find(({id}) => id === assetOutId);

  return {
    round: confirmedRound,
    assetIn: {
      // The actual spent amount is the input amount minus the change (refunded) amount, if any
      amount: BigInt(assetIn.amount) - BigInt(assetInChangeAmount || 0),
      id: assetIn.id
    },
    assetOut,
    quote,
    txnID
  };
}

/**
 * @param type - Type of the swap
 * @param pool - Information for the pool.
 * @param assetIn - Asset to be swapped
 * @param assetOut - Asset to be received
 * @param amount - Amount of asset to be swapped
 * @param network - Network to be used
 * @param isSwapRouterEnabled - Whether the swap router is enabled
 * @returns A promise for the Swap quote
 */
async function getQuote({
  type,
  amount,
  assetIn,
  assetOut,
  network,
  isSwapRouterEnabled,
  pool
}: {
  type: SwapType;
  amount: number | bigint;
  assetIn: AssetWithIdAndDecimals;
  assetOut: AssetWithIdAndDecimals;
  pool: V2PoolInfo | null;
  network: SupportedNetwork;
  isSwapRouterEnabled?: boolean;
}): Promise<SwapQuote> {
  let quote: SwapQuote;

  if (type === SwapType.FixedInput) {
    quote = await getFixedInputSwapQuote({
      assetIn,
      assetOut,
      amount,
      isSwapRouterEnabled,
      network,
      pool
    });
  } else {
    quote = await getFixedOutputSwapQuote({
      amount,
      assetIn,
      assetOut,
      isSwapRouterEnabled,
      network,
      pool
    });
  }

  return quote;
}

function validateQuotes(quotePromises: Promise<SwapQuote>[]): Promise<SwapQuote[]> {
  return Promise.allSettled(quotePromises).then((results) => {
    if (results.every((result) => result.status === "rejected")) {
      const directQuoteError = (results[0] as PromiseRejectedResult)
        .reason as SwapQuoteError;

      //  If all promises are rejected and there are 2 of them, it means that both direct and router quotes failed.
      //  In this case, if the direct quote failed because of an OutputAmountExceedsAvailableLiquidityError and the router quote failed because of a SwapRouterRouteError,
      //  we want to throw OutputAmountExceedsAvailableLiquidityError error instead of the SwapRouterRouteError. Otherwise, we want to throw the error from swap router.
      if (results.length === 2) {
        const routerQuoteError = (results[1] as PromiseRejectedResult)
          .reason as SwapQuoteError;

        if (
          isSwapQuoteErrorCausedByAmount(directQuoteError) &&
          !isSwapQuoteErrorCausedByAmount(routerQuoteError)
        ) {
          throw directQuoteError;
        }

        throw routerQuoteError;
      }

      //  Otherwise, we want to throw the error from the direct quote.
      throw directQuoteError;
    }

    return (
      results.filter(
        (result) => result.status === "fulfilled" && result.value
      ) as PromiseFulfilledResult<SwapQuote>[]
    ).map((result) => result.value);
  });
}

function getFixedInputDirectSwapQuote({
  amount,
  assetIn,
  assetOut,
  pool
}: {
  pool: V2PoolInfo;
  amount: number | bigint;
  assetIn: AssetWithIdAndDecimals;
  assetOut: AssetWithIdAndDecimals;
}): DirectSwapQuote {
  if (!poolUtils.isPoolReady(pool)) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.NoAvailablePoolError,
      "There is not an available pool for this asset pair"
    );
  }

  const [
    {id: assetInID, decimals: assetInDecimals},
    {id: assetOutID, decimals: assetOutDecimals}
  ] = [assetIn, assetOut];

  const assetInAmount = BigInt(amount);
  const totalFeeShare = pool.totalFeeShare!;

  let inputSupply: bigint;
  let outputSupply: bigint;

  if (assetInID === pool.asset1ID) {
    inputSupply = pool.asset1Reserves!;
    outputSupply = pool.asset2Reserves!;
  } else if (assetInID === pool.asset2ID) {
    inputSupply = pool.asset2Reserves!;
    outputSupply = pool.asset1Reserves!;
  } else {
    throw new SwapQuoteError(
      SwapQuoteErrorType.AssetDoesNotBelongToPoolError,
      `Input asset (#${assetInID}) doesn't belong to the pool ${pool.account.address()}.`
    );
  }

  const {swapOutputAmount, totalFeeAmount, priceImpact} = calculateFixedInputSwap({
    inputSupply,
    outputSupply,
    swapInputAmount: assetInAmount,
    totalFeeShare,
    decimals: {
      assetIn: assetInDecimals,
      assetOut: assetOutDecimals
    }
  });

  if (swapOutputAmount > outputSupply) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.OutputAmountExceedsAvailableLiquidityError,
      "Output amount exceeds available liquidity."
    );
  }

  if (isSwapAssetInAmountLow(Number(amount))) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.LowSwapAmountError,
      "Swap amount is too low."
    );
  }

  return {
    assetInID,
    assetInAmount,
    assetOutID,
    assetOutAmount: swapOutputAmount,
    swapFee: Number(totalFeeAmount),
    rate:
      convertFromBaseUnits(assetOutDecimals, Number(swapOutputAmount)) /
      convertFromBaseUnits(assetInDecimals, Number(assetInAmount)),
    priceImpact
  };
}

function getFixedOutputDirectSwapQuote({
  amount,
  assetIn,
  assetOut,
  pool
}: {
  pool: V2PoolInfo | null;
  amount: number | bigint;
  assetIn: AssetWithIdAndDecimals;
  assetOut: AssetWithIdAndDecimals;
}): SwapQuote {
  if (!pool || !poolUtils.isPoolReady(pool)) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.NoAvailablePoolError,
      "There is not an available pool for this asset pair"
    );
  }

  const [
    {id: assetInID, decimals: assetInDecimals},
    {id: assetOutID, decimals: assetOutDecimals}
  ] = [assetIn, assetOut];

  const assetOutAmount = BigInt(amount);
  const totalFeeShare = pool.totalFeeShare!;
  let inputSupply: bigint;
  let outputSupply: bigint;

  if (assetOutID === pool.asset1ID) {
    inputSupply = pool.asset2Reserves!;
    outputSupply = pool.asset1Reserves!;
  } else if (assetOutID === pool.asset2ID) {
    inputSupply = pool.asset1Reserves!;
    outputSupply = pool.asset2Reserves!;
  } else {
    throw new SwapQuoteError(
      SwapQuoteErrorType.AssetDoesNotBelongToPoolError,
      `Output asset (#${assetOutID}) doesn't belong to the pool ${pool.account.address()}.`
    );
  }

  const {swapInputAmount, totalFeeAmount, priceImpact} = calculateFixedOutputSwap({
    inputSupply,
    outputSupply,
    swapOutputAmount: assetOutAmount,
    totalFeeShare,
    decimals: {
      assetIn: assetInDecimals,
      assetOut: assetOutDecimals
    }
  });

  if (assetOutAmount > outputSupply) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.OutputAmountExceedsAvailableLiquidityError,
      "Output amount exceeds available liquidity."
    );
  }

  if (isSwapAssetInAmountLow(Number(swapInputAmount))) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.LowSwapAmountError,
      "Swap amount is too low."
    );
  }

  return {
    type: SwapQuoteType.Direct,
    data: {
      pool,
      quote: {
        assetInID,
        assetInAmount: swapInputAmount,
        assetOutID,
        assetOutAmount,
        swapFee: Number(totalFeeAmount),
        rate:
          convertFromBaseUnits(assetOutDecimals, Number(assetOutAmount)) /
          convertFromBaseUnits(assetInDecimals, Number(swapInputAmount)),
        priceImpact
      }
    }
  };
}

/**
 * @returns A quote for a fixed input swap. Does NOT execute any transactions.
 */
async function getFixedInputSwapQuote({
  amount,
  assetIn,
  assetOut,
  isSwapRouterEnabled,
  network,
  pool
}: {
  amount: number | bigint;
  assetIn: AssetWithIdAndDecimals;
  assetOut: AssetWithIdAndDecimals;
  network: SupportedNetwork;
  pool: V2PoolInfo | null;
  isSwapRouterEnabled?: boolean;
}): Promise<SwapQuote> {
  const quotePromises: Promise<SwapQuote>[] = [];

  if (pool) {
    quotePromises.push(
      new Promise((resolve, reject) => {
        try {
          const quote = getFixedInputDirectSwapQuote({
            amount,
            assetIn,
            assetOut,
            pool
          });

          resolve({
            type: SwapQuoteType.Direct,
            data: {
              pool,
              quote
            }
          });
        } catch (error) {
          reject(error);
        }
      })
    );
  } else {
    quotePromises.push(
      Promise.reject(
        new SwapQuoteError(
          SwapQuoteErrorType.NoAvailablePoolError,
          "There is not an available pool for this asset pair"
        )
      )
    );
  }

  if (isSwapRouterEnabled) {
    quotePromises.push(
      getSwapRoute({
        amount,
        assetInID: assetIn.id,
        assetOutID: assetOut.id,
        swapType: SwapType.FixedInput,
        network
      }).then((data) => ({type: SwapQuoteType.Router, data}))
    );
  }

  const validQuotes = await validateQuotes(quotePromises);

  return getBestQuote(validQuotes);
}

/**
 * @returns A quote for a fixed output swap. Does NOT execute any transactions.
 */
async function getFixedOutputSwapQuote({
  amount,
  assetIn,
  assetOut,
  isSwapRouterEnabled,
  network,
  pool
}: {
  amount: number | bigint;
  assetIn: AssetWithIdAndDecimals;
  assetOut: AssetWithIdAndDecimals;
  pool: V2PoolInfo | null;
  network: SupportedNetwork;
  isSwapRouterEnabled?: boolean;
}): Promise<SwapQuote> {
  const quotePromises: Promise<SwapQuote>[] = [
    new Promise((resolve, reject) => {
      try {
        resolve(
          getFixedOutputDirectSwapQuote({
            amount,
            assetIn,
            assetOut,
            pool
          })
        );
      } catch (error) {
        reject(error);
      }
    })
  ];

  if (isSwapRouterEnabled) {
    quotePromises.push(
      getSwapRoute({
        amount,
        assetInID: assetIn.id,
        assetOutID: assetOut.id,
        swapType: SwapType.FixedOutput,
        network
      }).then((data) => ({type: SwapQuoteType.Router, data}))
    );
  }

  const validQuotes = await validateQuotes(quotePromises);

  return getBestQuote(validQuotes);
}

function calculateFixedInputSwap({
  inputSupply,
  outputSupply,
  swapInputAmount,
  totalFeeShare,
  decimals
}: {
  inputSupply: bigint;
  outputSupply: bigint;
  swapInputAmount: bigint;
  totalFeeShare: bigint;
  decimals: {assetIn: number; assetOut: number};
}) {
  const totalFeeAmount = BigInt(
    calculateFixedInputFeeAmount({
      inputAmount: swapInputAmount,
      totalFeeShare
    })
  );
  const swapAmount = swapInputAmount - totalFeeAmount;
  const swapOutputAmount = calculateOutputAmountOfFixedInputSwap({
    inputSupply,
    outputSupply,
    swapAmount
  });
  const priceImpact = calculatePriceImpact({
    inputSupply,
    outputSupply,
    assetIn: {
      amount: swapInputAmount,
      decimals: decimals.assetIn
    },
    assetOut: {
      amount: swapOutputAmount,
      decimals: decimals.assetOut
    }
  });

  return {
    swapOutputAmount,
    totalFeeAmount,
    priceImpact
  };
}

function calculateFixedOutputSwap({
  inputSupply,
  outputSupply,
  swapOutputAmount,
  totalFeeShare,
  decimals
}: {
  inputSupply: bigint;
  outputSupply: bigint;
  swapOutputAmount: bigint;
  totalFeeShare: bigint;
  decimals: {assetIn: number; assetOut: number};
}) {
  const swapAmount = calculateSwapAmountOfFixedOutputSwap({
    inputSupply,
    outputSupply,
    outputAmount: swapOutputAmount
  });
  const totalFeeAmount = calculateFixedOutputFeeAmount({
    swapAmount,
    totalFeeShare
  });
  const swapInputAmount = swapAmount + totalFeeAmount;
  const priceImpact = calculatePriceImpact({
    inputSupply,
    outputSupply,
    assetIn: {
      amount: swapInputAmount,
      decimals: decimals.assetIn
    },
    assetOut: {
      amount: swapOutputAmount,
      decimals: decimals.assetOut
    }
  });

  return {
    swapInputAmount,
    totalFeeAmount,
    priceImpact
  };
}

function calculateFixedInputFeeAmount({
  inputAmount,
  totalFeeShare
}: {
  inputAmount: bigint;
  totalFeeShare: bigint;
}) {
  return Math.floor(Number(inputAmount * BigInt(totalFeeShare)) / 10_000);
}

function calculateFixedOutputFeeAmount({
  swapAmount,
  totalFeeShare
}: {
  swapAmount: bigint;
  totalFeeShare: bigint;
}) {
  const input_amount = Math.floor(
    Number((swapAmount * BigInt(10_000)) / (BigInt(10_000) - BigInt(totalFeeShare)))
  );
  const total_fee_amount = BigInt(input_amount) - swapAmount;

  return total_fee_amount;
}

function calculateOutputAmountOfFixedInputSwap({
  inputSupply,
  outputSupply,
  swapAmount
}: {
  inputSupply: bigint;
  outputSupply: bigint;
  swapAmount: bigint;
}): bigint {
  const k = inputSupply * outputSupply;
  let outputAmount = outputSupply - BigInt(k / (inputSupply + BigInt(swapAmount)));

  outputAmount -= BigInt(1);

  return outputAmount;
}

function calculateSwapAmountOfFixedOutputSwap({
  inputSupply,
  outputSupply,
  outputAmount
}: {
  inputSupply: bigint;
  outputSupply: bigint;
  outputAmount: bigint;
}): bigint {
  const k = inputSupply * outputSupply;
  let swapAmount = BigInt(k / (outputSupply - outputAmount)) - inputSupply;

  swapAmount += BigInt(1);

  return swapAmount;
}

export const SwapV2 = {
  getQuote,
  getFixedInputSwapQuote,
  getFixedInputDirectSwapQuote,
  getFixedOutputDirectSwapQuote,
  getFixedOutputSwapQuote,
  generateTxns,
  signTxns,
  execute,
  calculateFixedInputSwap
};
