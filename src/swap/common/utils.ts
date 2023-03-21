import {CONTRACT_VERSION} from "../../contract/constants";
import {ContractVersionValue} from "../../contract/types";
import {
  AssetWithAmountAndDecimals,
  AssetWithIdAndAmount
} from "../../util/asset/assetModels";
import {getAssetId} from "../../util/asset/assetUtils";
import SwapQuoteError, {SwapQuoteErrorType} from "../../util/error/SwapQuoteError";
import {convertFromBaseUnits, roundNumber} from "../../util/util";
import {SwapType} from "../constants";
import {SwapQuote, SwapQuoteType} from "../types";
import {V1_1_SWAP_TOTAL_FEE} from "../v1_1/constants";
import {
  getAssetInFromSwapRoute,
  getAssetOutFromSwapRoute,
  getSwapRouteRate
} from "../v2/router/util";
import {getV2SwapTotalFee} from "../v2/util";

function calculateSwapRate({
  assetIn,
  assetOut
}: {
  assetIn: AssetWithAmountAndDecimals;
  assetOut: AssetWithAmountAndDecimals;
}) {
  return (
    convertFromBaseUnits(assetOut.decimals, Number(assetOut.amount)) /
    convertFromBaseUnits(assetIn.decimals, Number(assetIn.amount))
  );
}

function calculatePriceImpact({
  inputSupply,
  outputSupply,
  assetIn,
  assetOut
}: {
  inputSupply: bigint;
  outputSupply: bigint;
  assetIn: AssetWithAmountAndDecimals;
  assetOut: AssetWithAmountAndDecimals;
}): number {
  const swapRate = calculateSwapRate({assetIn, assetOut});
  const poolPrice =
    convertFromBaseUnits(assetOut.decimals, Number(outputSupply)) /
    convertFromBaseUnits(assetIn.decimals, Number(inputSupply));

  return roundNumber({decimalPlaces: 5}, Math.abs(swapRate / poolPrice - 1));
}

function getSwapQuotePriceImpact(quote: SwapQuote) {
  return quote.type === SwapQuoteType.Router
    ? Number(quote.data.price_impact)
    : quote.data.quote.priceImpact;
}

function getAssetInFromSwapQuote(quote: SwapQuote): AssetWithIdAndAmount {
  if (quote.type === SwapQuoteType.Router) {
    const assetIn = getAssetInFromSwapRoute(quote.data.route);

    return {
      id: getAssetId(assetIn.asset),
      amount: Number(assetIn.amount)
    };
  }

  return {
    id: quote.data.quote.assetInID,
    amount: quote.data.quote.assetInAmount
  };
}

function getAssetOutFromSwapQuote(quote: SwapQuote): AssetWithIdAndAmount {
  if (quote.type === SwapQuoteType.Router) {
    const assetOut = getAssetOutFromSwapRoute(quote.data.route);

    return {
      id: getAssetId(assetOut.asset),
      amount: Number(assetOut.amount)
    };
  }

  return {
    id: quote.data.quote.assetOutID,
    amount: quote.data.quote.assetOutAmount
  };
}

function getAssetInAndAssetOutFromSwapQuote(quote: SwapQuote): {
  assetIn: AssetWithIdAndAmount;
  assetOut: AssetWithIdAndAmount;
} {
  return {
    assetIn: getAssetInFromSwapQuote(quote),
    assetOut: getAssetOutFromSwapQuote(quote)
  };
}

function getSwapQuoteContractVersion(quote: SwapQuote): ContractVersionValue {
  if (quote.type === SwapQuoteType.Direct) {
    return quote.data.pool.contractVersion;
  }
  return CONTRACT_VERSION.V2;
}

/**
 * @returns the total fee that will be paid by the user
 * for the swap transaction with given parameters
 */
function getSwapTotalFee(
  params:
    | {
        version: typeof CONTRACT_VERSION.V1_1;
      }
    | {
        version: typeof CONTRACT_VERSION.V2;
        type: SwapType;
      }
) {
  switch (params.version) {
    case CONTRACT_VERSION.V1_1:
      return V1_1_SWAP_TOTAL_FEE;

    case CONTRACT_VERSION.V2:
      return getV2SwapTotalFee(params.type);

    default:
      throw new Error("Provided contract version was not valid.");
  }
}

/**
 * @returns The asset amount ratio for the given quote
 */
function getSwapQuoteRate(quote: SwapQuote): number {
  if (quote.type === SwapQuoteType.Direct) {
    return quote.data.quote.rate;
  }

  return getSwapRouteRate(quote.data.route);
}

/**
 * Compares the given quotes and returns the best one (with the highest rate).
 */
function getBestQuote(quotes: SwapQuote[]): SwapQuote {
  let bestQuote: SwapQuote = quotes[0];
  let bestQuoteRate = getSwapQuoteRate(bestQuote);

  for (let index = 1; index < quotes.length; index++) {
    const quote = quotes[index];
    const currentRate = getSwapQuoteRate(quote);

    if (currentRate > bestQuoteRate) {
      bestQuote = quote;
      bestQuoteRate = currentRate;
    }
  }

  return bestQuote;
}

function isSwapQuoteErrorCausedByAmount(error: Error): boolean {
  return (
    error instanceof SwapQuoteError &&
    [
      SwapQuoteErrorType.SwapRouterInsufficientReservesError,
      SwapQuoteErrorType.SwapRouterLowSwapAmountError,
      SwapQuoteErrorType.OutputAmountExceedsAvailableLiquidityError,
      SwapQuoteErrorType.LowSwapAmountError
    ].includes(error.type)
  );
}

export {
  calculateSwapRate,
  calculatePriceImpact,
  getSwapQuotePriceImpact,
  getAssetInFromSwapQuote,
  getAssetOutFromSwapQuote,
  getAssetInAndAssetOutFromSwapQuote,
  getSwapQuoteContractVersion,
  getSwapTotalFee,
  getSwapQuoteRate,
  getBestQuote,
  isSwapQuoteErrorCausedByAmount
};
