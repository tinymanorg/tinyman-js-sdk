import {encodeString} from "../../util/util";

export const V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT = 2;
export const V2_REMOVE_LIQUIDITY_APP_ARGUMENT = encodeString("remove_liquidity");
export enum V2RemoveLiquidityTxnIndices {
  ASSET_TRANSFER_TXN = 0,
  APP_CALL_TXN
}
/**
 * A small portion of the pool is reserved (locked) for possible rounding errors.
 */
export const V2_LOCKED_POOL_TOKENS = 1000;
