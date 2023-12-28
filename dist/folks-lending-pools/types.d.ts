import { AssetWithIdAndAmount } from "../util/asset/assetModels";
export type FolksLendingAssetInfo = AssetWithIdAndAmount & {
    fAssetId: number;
    lendingAppId: number;
};
