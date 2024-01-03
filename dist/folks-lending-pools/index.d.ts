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
    constructor(appId: number, managerAppId: number, depositInterestRate: number, depositInterestIndex: number, lastUpdate: number);
    private calcDepositInterestIndex;
    private getLastTimestamp;
    /**
     * Calculates the amount fAsset received when adding liquidity with original asset.
     */
    convertAddAmount(amount: number): number;
}
/**
 * Fetches Folks lending pool application info from the algod, parses the global state and builds FolksLendingPool object.
 */
export declare function fetchFolksLendingPool(algod: algosdk.Algodv2, appId: number): Promise<FolksLendingPool>;
export declare const LendingPool: {
    AddLiquidity: typeof AddLiquidity;
    RemoveLiquidity: typeof RemoveLiquidity;
};
