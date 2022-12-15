export declare const DECODED_APP_STATE_KEYS: {
    v1_1: {
        asset1: string;
        asset2: string;
    };
    v2: {
        asset1: string;
        asset2: string;
        poolTokenID: string;
        issuedPoolTokens: string;
        asset1Reserves: string;
        asset2Reserves: string;
        asset1ProtocolFees: string;
        asset2ProtocolFees: string;
        totalFeeShare: string;
        protocolFeeRatio: string;
        cumulativePriceUpdateTimeStamp: string;
    };
};
/**
 * A small portion of the pool is reserved (locked) for possible rounding errors.
 */
export declare const V2_LOCKED_POOL_TOKENS = 1000;
