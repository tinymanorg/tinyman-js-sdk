import { AssetWithIdAndAmount } from "../util/asset/assetModels";
export type FolksLendingAssetInfo = AssetWithIdAndAmount & {
    fAssetId: number;
    lendingAppId: number;
};
export interface FolksLendingPool {
    appId: number;
    managerAppId: number;
    depositInterestRate: number;
    depositInterestIndex: number;
    updatedAt: Date;
    originalAssetId: number;
    fAssetId: number;
}
