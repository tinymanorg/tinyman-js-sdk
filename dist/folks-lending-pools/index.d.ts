import algosdk from "algosdk";
import * as AddLiquidity from "./add-liquidity";
import * as RemoveLiquidity from "./remove-liquidity";
export declare class FolksLendingPool {
    appId: number;
    managerAppId: number;
    private depositInterestRate;
    private depositInterestIndex;
    private lastUpdate;
    escrowAddress: string;
    constructor(appId: number, managerAppId: number, depositInterestRate: bigint, depositInterestIndex: bigint, lastUpdate: number);
    private getLastTimestamp;
    private getDepositInterestIndex;
    /**
     * Calculates the amount fAsset received when adding liquidity with original asset.
     */
    calculateDepositReturn(depositAmount: number): bigint;
    /**
     * Calculates the amount original asset received when removing liquidity from fAsset pool.
     */
    calculateWithdrawReturn(withdrawAmount: number): bigint;
}
/**
 * Fetches Folks lending pool application info from the algod, parses the global state and builds FolksLendingPool object.
 */
export declare function fetchFolksLendingPool(algod: algosdk.Algodv2, appId: number): Promise<FolksLendingPool>;
export declare const LendingPool: {
    AddLiquidity: typeof AddLiquidity;
    RemoveLiquidity: typeof RemoveLiquidity;
};
