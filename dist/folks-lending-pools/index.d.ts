import algosdk from "algosdk";
import * as AddLiquidity from "./add-liquidity";
import * as RemoveLiquidity from "./remove-liquidity";
import { getFolksWrapperAppOptInRequiredAssetIDs } from "./add-liquidity/utils";
import { FolksLendingPool } from "./types";
/**
 * Calculates the amount fAsset received when adding liquidity with original asset.
 */
declare function calculateDepositReturn(depositAmount: number, depositInterestIndex: bigint, depositInterestRate: bigint, lastUpdate?: number): bigint;
/**
 * Calculates the amount original asset received when removing liquidity from fAsset pool.
 */
declare function calculateWithdrawReturn(withdrawAmount: number, depositInterestIndex: bigint, depositInterestRate: bigint, lastUpdate?: number): bigint;
/**
 * Fetches Folks lending pool application info from the algod, parses the global state and builds FolksLendingPool object.
 */
export declare function fetchFolksLendingPool(algod: algosdk.Algodv2, appId: number): Promise<FolksLendingPool>;
export declare const LendingPool: {
    AddLiquidity: typeof AddLiquidity;
    RemoveLiquidity: typeof RemoveLiquidity;
    calculateWithdrawReturn: typeof calculateWithdrawReturn;
    calculateDepositReturn: typeof calculateDepositReturn;
    getFolksWrapperAppOptInRequiredAssetIDs: typeof getFolksWrapperAppOptInRequiredAssetIDs;
};
export {};
