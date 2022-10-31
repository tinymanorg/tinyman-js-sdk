export interface V2QuoteAssetAmount {
  assetId: number;
  amount: bigint;
}

/** Shape of an object containing information about a remove liquidity quote. */
export interface V2RemoveLiquidityQuote {
  /** The round that this quote is based on. */
  round: number;
  // TODO: maybe convert to array: outputAssets: QuoteAssetAmount[] because I guess order is not important
  asset1Out: V2QuoteAssetAmount;
  asset2Out: V2QuoteAssetAmount;
  /** input liquidity */
  poolTokenAsset: V2QuoteAssetAmount;
}

export interface V2SingleAssetRemoveLiquidityQuote {
  /** The round that this quote is based on. */
  round: number;
  assetOut: V2QuoteAssetAmount;
  poolTokenAsset: V2QuoteAssetAmount;
  internalSwapQuote: V2InternalSwapQuote;
}

interface V2InternalSwapQuote {
  amountIn: V2QuoteAssetAmount;
  amountOut: V2QuoteAssetAmount;
  swapFees: V2QuoteAssetAmount;
  priceImpact: number;
}
