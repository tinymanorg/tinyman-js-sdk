export declare enum V1_1BootstrapTxnGroupIndices {
    FUNDING_TXN = 0,
    VALIDATOR_APP_CALL = 1,
    POOL_TOKEN_CREATE = 2,
    ASSET1_OPT_IN = 3,
    ASSET2_OPT_IN = 4
}
/**
 * Txn counts according to the pool type (ASA-ASA or ASA-Algo)
 * If it's ASA-Algo, there won't be `asset2Optin` txn within the bootstrap txn group
 */
export declare const V1_1_BOOTSTRAP_TXN_COUNT: {
    readonly ASA_ALGO: 4;
    readonly ASA_ASA: 5;
};
/**
 * Bootstrap operation funding txn amounts according to
 * the pool type (ASA-ASA or ASA-Algo) in microalgos.
 */
export declare const V1_1_BOOTSTRAP_FUNDING_TXN_AMOUNT: {
    readonly ASA_ALGO: 960000;
    readonly ASA_ASA: 859000;
};
