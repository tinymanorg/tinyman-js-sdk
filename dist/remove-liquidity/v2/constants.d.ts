export declare const V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT = 2;
export declare const V2_REMOVE_LIQUIDITY_APP_ARGUMENT: Uint8Array;
export declare enum V2RemoveLiquidityTxnIndices {
    ASSET_TRANSFER_TXN = 0,
    APP_CALL_TXN = 1
}
/**
 * A small portion of the pool is reserved (locked) for possible rounding errors.
 */
export declare const V2_LOCKED_POOL_TOKENS = 1000;
