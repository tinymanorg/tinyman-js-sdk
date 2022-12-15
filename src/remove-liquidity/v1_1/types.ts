/** An object containing information about a burn quote. */
export interface V1_1RemoveLiquidityQuote {
  /** The round that this quote is based on. */
  round: number;
  /** The ID of the first output asset in this quote. */
  asset1ID: number;
  /** The quantity of the first output asset in this quote. */
  asset1Out: bigint;
  /** The ID of the second output asset in this quote. */
  asset2ID: number;
  /** The quantity of the second output asset in this quote. */
  asset2Out: bigint;
  /** The ID of the input liquidity token asset in this quote. */
  poolTokenID: number;
  /** The quantity of the input liquidity token asset in this quote. */
  poolTokenIn: bigint;
}

/** An object containing information about a successfully executed  burn transaction. */
export interface V1_1RemoveLiquidityExecution {
  /** The round that the burn occurred in. */
  round: number;
  /**
   * The total amount of transaction fees that were spent (in microAlgos) to execute the burn and,
   * if applicable, redeem transactions.
   */
  fees: number;
  /** The ID of the first output asset. */
  asset1ID: number;
  /** The quantity of the first output asset. */
  asset1Out: bigint;
  /** The ID of the second output asset. */
  asset2ID: number;
  /** The quantity of the second output asset. */
  asset2Out: bigint;
  /** The ID of the liquidity token input asset. */
  poolTokenID: number;
  /** The quantity of the liquidity token input asset. */
  poolTokenIn: bigint;
  /** Excess amount details for the pool assets */
  excessAmounts: {
    assetID: number;
    excessAmountForBurning: bigint;
    totalExcessAmount: bigint;
  }[];
  /** The ID of the transaction. */
  txnID: string;
  /** The group ID for the transaction group. */
  groupID: string;
}
