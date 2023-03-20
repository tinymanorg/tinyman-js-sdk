import {ALGORAND_MIN_TX_FEE} from "algosdk";

import {SwapType, DEFAULT_SWAP_FEE_RATE} from "../constants";
import {V2_SWAP_APP_CALL_INNER_TXN_COUNT, V2_SWAP_TXN_COUNT} from "./constants";

/**
 * @returns the total fee for the swap operation including all transactions (including inner transactions) fees
 */
export function getV2SwapTotalFee(mode: SwapType) {
  const totalTxnCount = V2_SWAP_APP_CALL_INNER_TXN_COUNT[mode] + V2_SWAP_TXN_COUNT;

  return totalTxnCount * ALGORAND_MIN_TX_FEE;
}

/**
 * @returns the minimum possible amount of assetIn that can be used for swap in V2 pools
 */
export function getV2MinSwapAssetInAmount(feeRate: number = DEFAULT_SWAP_FEE_RATE) {
  return Math.ceil(1 / feeRate);
}

/**
 * @returns true if the amount of assetIn is less than the minimum possible amount of assetIn that can be used for swap in V2 pools
 */
export function isSwapAssetInAmountLow(
  amount: number,
  feeRate: number = DEFAULT_SWAP_FEE_RATE
) {
  return amount < getV2MinSwapAssetInAmount(feeRate);
}
