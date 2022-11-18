export enum V2AddLiquidityType {
  SINGLE = "single",
  FLEXIBLE = "flexible",
  INITIAL = "initial"
}

export const V2AddLiquidityTxnIndices = {
  [V2AddLiquidityType.FLEXIBLE]: {
    ASSET1_IN_TXN: 0,
    ASSET2_IN_TXN: 1,
    VALIDATOR_APP_CALL_TXN: 2
  },
  [V2AddLiquidityType.SINGLE]: {
    ASSET_IN_TXN: 0,
    VALIDATOR_APP_CALL_TXN: 1
  },
  [V2AddLiquidityType.INITIAL]: {
    ASSET1_IN_TXN: 0,
    ASSET2_IN_TXN: 1,
    VALIDATOR_APP_CALL_TXN: 2
  }
};

export const V2_ADD_LIQUIDITY_INNER_TXN_COUNT = {
  INITIAL_LIQUIDITY: 1,
  SINGLE_ASSET_MODE: 2,
  FLEXIBLE_MODE: 2
};
