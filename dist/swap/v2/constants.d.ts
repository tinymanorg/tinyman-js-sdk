export declare enum V2SwapTxnGroupIndices {
    /**
     * If the input asset is Algo, it'll be a payment txn, otherwise it'll be an asset transfer txn.
     */
    INPUT_TXN = 0,
    APP_CALL_TXN = 1
}
export declare const V2_SWAP_APP_CALL_INNER_TXN_COUNT: {
    readonly "fixed-input": 1;
    readonly "fixed-output": 2;
};
/**
 * Number of transactions in the swap transaction group (excluding inner transactions)
 */
export declare const V2_SWAP_TXN_COUNT = 2;
export declare const V2_SWAP_APP_CALL_ARG_ENCODED: Uint8Array;
export declare const V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED: {
    readonly "fixed-input": Uint8Array;
    readonly "fixed-output": Uint8Array;
};
export declare const V2_SWAP_ROUTER_APP_ARGS_ENCODED: {
    ASSET_OPT_IN: Uint8Array;
};
