import { PoolReserves } from "../../util/pool/poolTypes";
export declare function calculateSubsequentAddLiquidity(reserves: PoolReserves, totalFeeShare: number | bigint, asset1Amount: number | bigint, asset2Amount: number | bigint): {
    poolTokenAssetAmount: bigint;
    swapFromAsset1ToAsset2: any;
    swapInAmount: bigint;
    swapOutAmount: bigint;
    swapTotalFeeAmount: bigint;
    swapPriceImpact: bigint;
};
