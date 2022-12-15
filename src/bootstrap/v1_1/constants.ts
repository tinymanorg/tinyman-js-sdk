export enum V1_1BootstrapTxnGroupIndices {
  FUNDING_TXN = 0,
  VALIDATOR_APP_CALL,
  POOL_TOKEN_CREATE,
  ASSET1_OPT_IN,
  ASSET2_OPT_IN
}

/**
 * Txn counts according to the pool type (ASA-ASA or ASA-Algo)
 * If it's ASA-Algo, there won't be `asset2Optin` txn within the bootstrap txn group
 */
export const V1_1_BOOTSTRAP_TXN_COUNT = {
  ASA_ALGO: 4,
  ASA_ASA: 5
} as const;

/**
 * Bootstrap operation funding txn amounts according to
 * the pool type (ASA-ASA or ASA-Algo) in microalgos.
 */
export const V1_1_BOOTSTRAP_FUNDING_TXN_AMOUNT = {
  ASA_ALGO: 960_000,
  ASA_ASA: 859_000
} as const;
