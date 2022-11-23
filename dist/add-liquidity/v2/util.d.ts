import { PoolReserves } from "../../util/pool/poolTypes";
export declare function calculateSubsequentAddLiquidity(reserves: Omit<PoolReserves, "round">, totalFeeShare: number | bigint, asset1Amount: number | bigint, asset2Amount: number | bigint, decimals: {
    asset1: number;
    asset2: number;
}): {
    poolTokenAssetAmount: bigint;
    swapFromAsset1ToAsset2: any;
    swapInAmount: bigint;
    swapOutAmount: bigint;
    swapTotalFeeAmount: bigint;
    swapPriceImpact: number;
};
export declare function calculateInitialAddLiquidity(asset1: {
    amount: bigint | number;
    decimals: number;
}, asset2: {
    amount: bigint | number;
    decimals: number;
}): bigint;
