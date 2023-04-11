import { CONTRACT_VERSION } from "../../contract/constants";
import { ContractVersionValue } from "../../contract/types";
import { AssetWithAmountAndDecimals, AssetWithIdAndAmount } from "../../util/asset/assetModels";
import { SwapType } from "../constants";
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
declare function getSwapQuoteContractVersion(quote: SwapQuote): ContractVersionValue;
/**
 * @returns the total fee that will be paid by the user
 * for the swap transaction with given parameters
 */
declare function getSwapTotalFee(params: {
    version: typeof CONTRACT_VERSION.V1_1;
} | {
    version: typeof CONTRACT_VERSION.V2;
    type: SwapType;
}): number;
/**
 * @returns The asset amount ratio for the given quote
 */
declare function getSwapQuoteRate(quote: SwapQuote): number;
/**
 * Compares the given quotes and returns the best one (with the highest rate).
 */
declare function getBestQuote(quotes: SwapQuote[]): SwapQuote;
declare function isSwapQuoteErrorCausedByAmount(error: Error): boolean;
export { calculateSwapRate, calculatePriceImpact, getSwapQuotePriceImpact, getAssetInFromSwapQuote, getAssetOutFromSwapQuote, getAssetInAndAssetOutFromSwapQuote, getSwapQuoteContractVersion, getSwapTotalFee, getSwapQuoteRate, getBestQuote, isSwapQuoteErrorCausedByAmount };
