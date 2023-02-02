import { PoolReserves } from "../../util/pool/poolTypes";
import { V2AddLiquidityType } from "./constants";
import { AssetWithAmountAndDecimals } from "../../util/asset/assetModels";
export declare function calculateSubsequentAddLiquidity({ reserves, totalFeeShare, asset1Amount, asset2Amount, decimals }: {
    reserves: Omit<PoolReserves, "round">;
    totalFeeShare: number | bigint;
    asset1Amount: number | bigint;
    asset2Amount: number | bigint;
    decimals: {
        asset1: number;
        asset2: number;
    };
}): {
    poolTokenAssetAmount: bigint;
    swapFromAsset1ToAsset2: any;
    swapInAmount: bigint;
    swapOutAmount: bigint;
    swapTotalFeeAmount: bigint;
    swapPriceImpact: number;
};
/**
 * @returns the amount of pool tokens that should be issued for the initial add liquidity operation
 */
export declare function calculateV2InitialLiquidityAmount(asset1: AssetWithAmountAndDecimals, asset2: AssetWithAmountAndDecimals): bigint;
/**
 * @returns the fee that should be assigned to the app call transaction
 */
export declare function getV2AddLiquidityAppCallFee(mode: V2AddLiquidityType): number;
/**
 * @returns the total fee for the add liquidity operation including all transaction (including inner transactions) fees
 */
export declare function getV2AddLiquidityTotalFee(mode: V2AddLiquidityType): number;
