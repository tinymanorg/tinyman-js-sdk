declare function calculateSwapRate({ assetIn, assetOut }: {
    assetIn: AssetWithAmountAndDecimals;
    assetOut: AssetWithAmountAndDecimals;
}): number;
declare function calculatePriceImpact({ inputSupply, outputSupply, assetIn, assetOut }: {
    inputSupply: bigint;
    outputSupply: bigint;
    assetIn: AssetWithAmountAndDecimals;
    assetOut: AssetWithAmountAndDecimals;
}): number;
export { calculateSwapRate, calculatePriceImpact };
