interface QuoteAssetAmount {
  assetId: number;
  amount: bigint;
}

/** Shape of an object containing information about a remove liquidity quote. */
export interface V2RemoveLiquidityQuote {
  /** The round that this quote is based on. */
  round: number;
  // TODO: maybe convert to array: outputAssets: QuoteAssetAmount[] because I guess order is not important
  asset1Out: QuoteAssetAmount;
  asset2Out: QuoteAssetAmount;
  /** input liquidity */
  poolTokenAsset: QuoteAssetAmount;
  slippage: number;
}

export interface V2SingleAssetRemoveLiquidityQuote {
  /** The round that this quote is based on. */
  round: number;
  assetOut: QuoteAssetAmount;
  poolTokenAsset: QuoteAssetAmount;
  slippage: number;
  internalSwapQuote: V2InternalSwapQuote;
}

interface V2InternalSwapQuote {
  amount_in: QuoteAssetAmount;
  amount_out: QuoteAssetAmount;
  swap_fees: QuoteAssetAmount;
  price_impact: number;
}
