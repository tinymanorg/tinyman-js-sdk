declare function calculateSwapRate({ assetIn, assetOut }: {
    assetIn: {
        decimals: number;
        amount: number | bigint;
    };
    assetOut: {
        decimals: number;
        amount: number | bigint;
    };
}): number;
declare function calculatePriceImpact({ inputSupply, outputSupply, assetIn, assetOut }: {
    inputSupply: bigint;
    outputSupply: bigint;
    assetIn: {
        decimals: number;
        amount: number | bigint;
    };
    assetOut: {
        decimals: number;
        amount: number | bigint;
    };
}): number;
export { calculateSwapRate, calculatePriceImpact };
