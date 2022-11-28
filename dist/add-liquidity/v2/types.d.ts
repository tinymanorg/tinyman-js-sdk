export interface V2InitialAddLiquidityQuote {
    asset1ID: number;
    asset2ID: number;
    asset1In: bigint;
    asset2In: bigint;
    poolTokenAssetAmount: bigint;
    slippage: number;
}
export interface V2FlexibleAddLiquidityQuote {
    asset1ID: number;
    asset2ID: number;
    asset1In: bigint;
    asset2In: bigint;
    liquidityOut: bigint;
    liquidityID: number;
    share: number;
    slippage: number;
    swapQuote: V2AddLiquidityInternalSwapQuote;
    minPoolTokenAssetAmountWithSlippage: bigint;
}
export interface V2SingleAssetInAddLiquidityQuote {
    assetIn: {
        id: number;
        amount: bigint;
    };
    poolTokenOut: {
        id: number;
        amount: bigint;
    };
    share: number;
    slippage: number;
    internalSwapQuote: V2AddLiquidityInternalSwapQuote;
    minPoolTokenAssetAmountWithSlippage: bigint;
}
export interface V2AddLiquidityInternalSwapQuote {
    amountIn: bigint;
    amountOut: bigint;
    swapFees: bigint;
    priceImpact: number;
}
export interface V2AddLiquidityExecution {
    /** The round that the add liquidity occurred in. */
    round: number;
    /** The ID of the transaction. */
    txnID: string;
    /**
     * The total amount of transaction fees that were spent (in microAlgos) to execute the add liquidity and,
     * if applicable, redeem transactions.
     */
    fees: number;
    /** The ID of the output liquidity token asset. */
    liquidityID: number;
    /** The group ID for the transaction group. */
    groupID: string;
    assetOut: {
        assetID: number;
        amount: number | bigint;
    };
}
