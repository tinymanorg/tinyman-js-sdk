import { Algodv2 } from "algosdk";
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
declare function getRewardClaimSheet(algod: Algodv2, appId: number, address: string, accountRewardClaimSheetBoxIndex: number): Promise<RewardClaimSheet | null>;
export { getAccountRewardClaimSheetBoxName, getRewardClaimSheet, getRewardPeriodBoxName, RewardClaimSheet, RewardsAppGlobalState };
