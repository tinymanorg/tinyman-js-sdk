import { AssetWithAmountAndDecimals, AssetWithIdAndAmount } from "../../util/asset/assetModels";
import { SwapQuote } from "../types";
declare function calculateSwapRate({ assetIn, assetOut }: {
    assetIn: AssetWithAmountAndDecimals;
    assetOut: AssetWithAmountAndDecimals;
}): number;
declare function calculatePriceImpact({ inputSupply, outputSupply, assetIn, assetOut }: {
    inputSupply: bigint;
    outputSupply: bigint;
    assetIn: AssetWithAmountAndDecimals;
    assetOut: AssetWithAmountAndDecimals;
}): number;
declare function getSwapQuotePriceImpact(quote: SwapQuote): number;
declare function getAssetInFromSwapQuote(quote: SwapQuote): AssetWithIdAndAmount;
declare function getAssetOutFromSwapQuote(quote: SwapQuote): AssetWithIdAndAmount;
declare function getAssetInAndAssetOutFromSwapQuote(quote: SwapQuote): {
    assetIn: AssetWithIdAndAmount;
    assetOut: AssetWithIdAndAmount;
};
declare function getSwapQuoteContractVersion(quote: SwapQuote): import("../..").ContractVersionValue;
export { calculateSwapRate, calculatePriceImpact, getSwapQuotePriceImpact, getAssetInFromSwapQuote, getAssetOutFromSwapQuote, getAssetInAndAssetOutFromSwapQuote, getSwapQuoteContractVersion };
