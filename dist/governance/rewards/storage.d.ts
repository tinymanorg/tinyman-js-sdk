import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { GetRawBoxValueCacheProps } from "../types";
declare class RewardsAppGlobalState {
    tinyAssetId: number;
    vaultAppId: number;
    rewardHistoryCount: number;
    firstPeriodTimestamp: number;
    rewardPeriodCount: number;
    manager: string;
    rewardsManager: string;
    constructor(tinyAssetId: number, vaultAppId: number, rewardHistoryCount: number, firstPeriodTimestamp: number, rewardPeriodCount: number, manager: string, rewardsManager: string);
}
declare class RewardClaimSheet {
    value: Uint8Array;
    constructor(value: Uint8Array);
}
declare function getRewardPeriodBoxName(boxIndex: number): Uint8Array;
declare function getAccountRewardClaimSheetBoxName(address: string, boxIndex: number): Uint8Array;
declare function getRewardClaimSheet(algod: AlgodClient, appId: number, address: string, accountRewardClaimSheetBoxIndex: number, cacheProps?: GetRawBoxValueCacheProps): Promise<RewardClaimSheet | null>;
export { RewardClaimSheet, RewardsAppGlobalState, getRewardPeriodBoxName, getAccountRewardClaimSheetBoxName, getRewardClaimSheet };
