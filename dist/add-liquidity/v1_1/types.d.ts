/** An object containing information about an add liquidity quote. */
export interface V1_1AddLiquidityQuote {
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
    /** The ID of the pool token output in this quote. */
    poolTokenID: number;
    /** The amount of the pool token output in this quote. */
    poolTokenOut: bigint;
    /** The share of the total liquidity in this quote. */
    share: number;
}
/** An object containing information about a successfully executed add liquidity transaction. */
export interface V1_1AddLiquidityExecution {
    /** The round that the add liquidity occurred in. */
    round: number;
    /**
     * The total amount of transaction fees that were spent (in microAlgos) to execute the add liquidity and,
     * if applicable, redeem transactions.
     */
    fees: number;
    /** The ID of the output pool token asset. */
    poolTokenID: number;
    /** The quantity of the output pool token asset. */
    poolTokenOut?: bigint;
    excessAmount?: {
        /** Excess amount for the current add liquidity */
        excessAmountForAddingLiquidity: bigint;
        /** Total excess amount accumulated for the pool asset */
        totalExcessAmount: bigint;
    };
    /** The ID of the transaction. */
    txnID: string;
    /** The group ID for the transaction group. */
    groupID: string;
}
