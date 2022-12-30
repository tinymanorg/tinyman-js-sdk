export declare enum V2AddLiquidityType {
    SINGLE = "single",
    FLEXIBLE = "flexible",
    INITIAL = "initial"
}
export declare const V2AddLiquidityTxnIndices: {
    flexible: {
        ASSET1_IN_TXN: number;
        ASSET2_IN_TXN: number;
        VALIDATOR_APP_CALL_TXN: number;
    };
    single: {
        ASSET_IN_TXN: number;
        VALIDATOR_APP_CALL_TXN: number;
    };
    initial: {
        ASSET1_IN_TXN: number;
        ASSET2_IN_TXN: number;
        VALIDATOR_APP_CALL_TXN: number;
    };
};
export declare const V2_ADD_LIQUIDITY_INNER_TXN_COUNT: Record<V2AddLiquidityType, number>;
/**
 * Number of transactions in the add liquidity transaction group (excluding inner transactions)
 */
export declare const V2_ADD_LIQUIDITY_TXN_COUNT: Record<V2AddLiquidityType, number>;
