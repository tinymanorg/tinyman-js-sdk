import { PoolReserves } from "../../util/pool/poolTypes";
import { V2AddLiquidityType } from "./constants";
import { AssetWithAmountAndDecimals, AssetWithIdAndAmountAndDecimals } from "../../util/asset/assetModels";
import { V2AddLiquidityInternalSwapQuote } from "./types";
export declare function calculateSubsequentAddLiquidity({ reserves, totalFeeShare, asset1, asset2 }: {
    totalFeeShare: number | bigint;
    reserves: Omit<PoolReserves, "round">;
    asset1: AssetWithIdAndAmountAndDecimals;
    asset2: AssetWithIdAndAmountAndDecimals;
}): {
    /** Amount of the pool tokens that will be out with the operation */
    poolTokenOutAmount: bigint;
    /**
     * Data about the internal swap, which will be made by the contract,
     * in case the given asset values doesn't satisfy the pool ratio.
     */
    internalSwapQuote: V2AddLiquidityInternalSwapQuote;
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
