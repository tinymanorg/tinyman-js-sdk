import {encodeString} from "../../util/util";
import {SwapType} from "../constants";

export enum V2SwapTxnGroupIndices {
  /**
   * If the input asset is Algo, it'll be a payment txn, otherwise it'll be an asset transfer txn.
   */
  INPUT_TXN = 0,
  APP_CALL_TXN
}

export const V2_SWAP_APP_CALL_INNER_TXN_COUNT = {
  [SwapType.FixedInput]: 1,
  [SwapType.FixedOutput]: 2
} as const;

/**
 * Number of transactions in the swap transaction group (excluding inner transactions)
 */
export const V2_SWAP_TXN_COUNT = 2;

export const V2_SWAP_APP_CALL_ARG_ENCODED = encodeString("swap");

export const V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED = {
  [SwapType.FixedInput]: encodeString("fixed-input"),
  [SwapType.FixedOutput]: encodeString("fixed-output")
} as const;

export const V2_SWAP_ROUTER_APP_ARGS_ENCODED = {
  ASSET_OPT_IN: encodeString("asset_opt_in")
} as const;
