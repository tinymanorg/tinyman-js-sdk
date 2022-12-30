import { SwapType } from "../constants";
/**
 * @returns the total fee for the swap operation including all transactions (including inner transactions) fees
 */
export declare function getV2SwapTotalFee(mode: SwapType): number;
