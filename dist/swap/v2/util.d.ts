import { SwapType } from "../constants";
/**
 * @returns the total fee for the swap operation including all transactions (including inner transactions) fees
 */
export declare function getV2SwapTotalFee(mode: SwapType): number;
/**
 * @returns the minimum possible amount of assetIn that can be used for swap in V2 pools
 */
export declare function getV2MinSwapAssetInAmount(feeRate?: number): number;
/**
 * @returns true if the amount of assetIn is less than the minimum possible amount of assetIn that can be used for swap in V2 pools
 */
export declare function isSwapAssetInAmountLow(amount: number, feeRate?: number): boolean;
