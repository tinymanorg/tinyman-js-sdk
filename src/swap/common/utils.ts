import {CONTRACT_VERSION} from "../../contract/constants";
import {
  AssetWithAmountAndDecimals,
  AssetWithIdAndAmount
} from "../../util/asset/assetModels";
import {getAssetId} from "../../util/asset/assetUtils";
import {convertFromBaseUnits, roundNumber} from "../../util/util";
import {SwapQuote, SwapQuoteType} from "../types";
import {getAssetInFromSwapRoute, getAssetOutFromSwapRoute} from "../v2/router/util";

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
    ? Number(quote.price_impact)
    : quote.quoteWithPool.quote.priceImpact;
}

function getAssetInFromSwapQuote(quote: SwapQuote): AssetWithIdAndAmount {
  if (quote.type === SwapQuoteType.Router) {
    const assetIn = getAssetInFromSwapRoute(quote.route);

    return {
      id: getAssetId(assetIn.asset),
      amount: Number(assetIn.amount)
    };
  }

  return {
    id: quote.quoteWithPool.quote.assetInID,
    amount: quote.quoteWithPool.quote.assetInAmount
  };
}

function getAssetOutFromSwapQuote(quote: SwapQuote): AssetWithIdAndAmount {
  if (quote.type === SwapQuoteType.Router) {
    const assetOut = getAssetOutFromSwapRoute(quote.route);

    return {
      id: getAssetId(assetOut.asset),
      amount: Number(assetOut.amount)
    };
  }

  return {
    id: quote.quoteWithPool.quote.assetOutID,
    amount: quote.quoteWithPool.quote.assetOutAmount
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

function getSwapQuoteContractVersion(quote: SwapQuote) {
  if (quote.type === SwapQuoteType.Direct) {
    return quote.quoteWithPool.pool.contractVersion;
  }
  return CONTRACT_VERSION.V2;
}

export {
  calculateSwapRate,
  calculatePriceImpact,
  getSwapQuotePriceImpact,
  getAssetInFromSwapQuote,
  getAssetOutFromSwapQuote,
  getAssetInAndAssetOutFromSwapQuote,
  getSwapQuoteContractVersion
};
