import {CONTRACT_VERSION} from "../../contract/constants";
import {ContractVersionValue} from "../../contract/types";
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

export {
  calculateSwapRate,
  calculatePriceImpact,
  getSwapQuotePriceImpact,
  getAssetInFromSwapQuote,
  getAssetOutFromSwapQuote,
  getAssetInAndAssetOutFromSwapQuote,
  getSwapQuoteContractVersion
};
