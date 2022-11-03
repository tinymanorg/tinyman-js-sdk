export enum V2BootstrapTxnGroupIndices {
  FUNDING_TXN = 0,
  VALIDATOR_APP_CALL
}

/**
 * Inner txn counts according to the pool type (ASA-ALGO or ASA-ASA)
 */
export const V2_BOOTSTRAP_INNER_TXN_COUNT = {
  ASA_ALGO: 5,
  ASA_ASA: 6
} as const;
