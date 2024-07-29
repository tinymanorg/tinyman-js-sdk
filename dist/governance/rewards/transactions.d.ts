import { SuggestedParams, Transaction } from "algosdk";
declare function prepareClaimRewardsTransactions({ rewardsAppId, vaultAppId, tinyAssetId, sender, periodIndexStart, periodCount, accountPowerIndexes, suggestedParams, createRewardClaimSheet, appCallNote }: {
    rewardsAppId: number;
    vaultAppId: number;
    tinyAssetId: number;
    sender: string;
    periodIndexStart: number;
    periodCount: number;
    accountPowerIndexes: number[];
    suggestedParams: SuggestedParams;
    createRewardClaimSheet: boolean;
    appCallNote?: string;
}): Transaction[];
export { prepareClaimRewardsTransactions };
