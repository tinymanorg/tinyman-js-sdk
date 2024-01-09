import algosdk from "algosdk";
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
    AddLiquidity: {
        calculateDepositReturn: typeof calculateDepositReturn;
        generateTxns({ client, network, poolAddress, poolTokenId, lendingManagerId, asset1In, asset2In, initiatorAddr }: {
            client: algosdk.Algodv2;
            network: import("..").SupportedNetwork;
            poolAddress: string;
            poolTokenId: number;
            lendingManagerId: number;
            asset1In: import("./types").FolksLendingAssetInfo;
            asset2In: import("./types").FolksLendingAssetInfo;
            initiatorAddr: string;
        }): Promise<import("..").SignerTransaction[]>;
        getAddLiquidityTotalFee(wrapperAppOptInRequiredAssetIdCount?: number | undefined): number;
    };
    RemoveLiquidity: {
        calculateWithdrawReturn: typeof calculateWithdrawReturn;
        generateTxns({ client, pool, poolTokenIn, initiatorAddr, asset1Out, asset2Out, lendingManagerId, network }: {
            client: algosdk.Algodv2;
            pool: Pick<import("..").V2PoolInfo, "account" | "poolTokenID">;
            poolTokenIn: number | bigint;
            initiatorAddr: string;
            asset1Out: Omit<import("./types").FolksLendingAssetInfo, "amount">;
            asset2Out: Omit<import("./types").FolksLendingAssetInfo, "amount">;
            lendingManagerId: number;
            network: import("..").SupportedNetwork;
        }): Promise<import("..").SignerTransaction[]>;
        getRemoveLiquidityTotalFee(): number;
    };
    getFolksWrapperAppOptInRequiredAssetIDs: typeof getFolksWrapperAppOptInRequiredAssetIDs;
};
export {};
