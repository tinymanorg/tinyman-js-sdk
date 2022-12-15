export enum V1_1RemoveLiquidityTxnIndices {
  FEE_TXN = 0,
  VALIDATOR_APP_CALL_TXN,
  ASSET1_OUT_TXN,
  ASSET2_OUT_TXN,
  POOL_TOKEN_IN_TXN
}

export const V1_1_REMOVE_LIQUIDITY_TXN_COUNT = Object.values(
  V1_1RemoveLiquidityTxnIndices
).length;
