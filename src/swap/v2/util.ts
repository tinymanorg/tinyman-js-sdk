import {ALGORAND_MIN_TX_FEE} from "algosdk";

import {SwapType} from "../constants";
import {V2_SWAP_APP_CALL_INNER_TXN_COUNT, V2_SWAP_TXN_COUNT} from "./constants";

/**
 * @returns the total fee for the swap operation including all transactions (including inner transactions) fees
 */
export function getV2SwapTotalFee(mode: SwapType) {
  const totalTxnCount = V2_SWAP_APP_CALL_INNER_TXN_COUNT[mode] + V2_SWAP_TXN_COUNT;

  return totalTxnCount * ALGORAND_MIN_TX_FEE;
}
