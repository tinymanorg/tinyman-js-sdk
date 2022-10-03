/** An object containing information about a mint quote. */
export interface MintQuote {
  /** The round that this quote is based on. */
  round: number;
  /** The ID of the first input asset in this quote. */
  asset1ID: number;
  /** The quantity of the first input asset in this quote. */
  asset1In: bigint;
  /** The ID of the second input asset in this quote. */
  asset2ID: number;
  /** The quantity of the second input asset in this quote. */
  asset2In: bigint;
  /** The ID of the liquidity token output in this quote. */
  liquidityID: number;
  /** The amount of the liquidity token output in this quote. */
  liquidityOut: bigint;
  /** The share of the total liquidity in this quote. */
  share: number;
}

/** An object containing information about a successfully executed mint transaction. */
export interface MintExecution {
  /** The round that the mint occurred in. */
  round: number;
  /**
   * The total amount of transaction fees that were spent (in microAlgos) to execute the mint and,
   * if applicable, redeem transactions.
   */
  fees: number;
  /** The ID of the output liquidity token asset. */
  liquidityID: number;
  /** The quantity of the output liquidity token asset. */
  liquidityOut: bigint;
  excessAmount: {
    /** Excess amount for the current mint */
    excessAmountForMinting: bigint;
    /** Total excess amount accumulated for the pool asset */
    totalExcessAmount: bigint;
  };
  /** The ID of the transaction. */
  txnID: string;
  /** The group ID for the transaction group. */
  groupID: string;
}

export enum MintTxnIndices {
  FEE_TXN = 0,
  VALIDATOR_APP_CALL_TXN,
  ASSET1_IN_TXN,
  ASSET2_IN_TXN,
  LIQUDITY_OUT_TXN
}
