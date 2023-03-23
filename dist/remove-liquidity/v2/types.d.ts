import { AssetWithIdAndAmount } from "../../util/asset/assetModels";
export interface V2QuoteAssetAmount {
    assetId: number;
    amount: bigint;
}
/** Shape of an object containing information about a remove liquidity quote. */
export interface V2RemoveLiquidityQuote {
    /** The round that this quote is based on. */
    round: number;
    asset1Out: V2QuoteAssetAmount;
    asset2Out: V2QuoteAssetAmount;
    /** input liquidity */
    poolTokenIn: V2QuoteAssetAmount;
}
export interface V2SingleAssetRemoveLiquidityQuote {
    /** The round that this quote is based on. */
    round: number;
    assetOut: V2QuoteAssetAmount;
    poolTokenIn: V2QuoteAssetAmount;
    internalSwapQuote: V2InternalSwapQuote;
}
interface V2InternalSwapQuote {
    amountIn: V2QuoteAssetAmount;
    amountOut: V2QuoteAssetAmount;
    swapFees: V2QuoteAssetAmount;
    priceImpact: number;
}
export interface V2RemoveLiquidityExecution {
    /**
     * Can be `undefined` if the execution was successful, but there was an issue while
     * extracting the output asset data fron the transaction response
     */
    outputAssets: AssetWithIdAndAmount[] | undefined;
    txnID: string;
}
export {};
