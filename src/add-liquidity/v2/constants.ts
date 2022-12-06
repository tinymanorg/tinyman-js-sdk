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

export const V2_ADD_LIQUIDITY_INNER_TXN_COUNT: Record<V2AddLiquidityType, number> = {
  [V2AddLiquidityType.INITIAL]: 1,
  [V2AddLiquidityType.SINGLE]: 2,
  [V2AddLiquidityType.FLEXIBLE]: 2
};

/**
 * Number of transactions in the add liquidity transaction group (excluding inner transactions)
 */
export const V2_ADD_LIQUIDITY_TXN_COUNT: Record<V2AddLiquidityType, number> = {
  /** Consists of: App Call, Asset 1 In, Asset 2 In */
  [V2AddLiquidityType.INITIAL]: 3,
  /** Consists of: App Call, Asset 1 In, Asset 2 In */
  [V2AddLiquidityType.FLEXIBLE]: 3,
  /** Consists of: App Call, Asset In */
  [V2AddLiquidityType.SINGLE]: 2
};
