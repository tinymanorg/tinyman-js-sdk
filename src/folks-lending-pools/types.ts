import {AssetWithIdAndAmount} from "../util/asset/assetModels";

export type FolksLendingAssetInfo = AssetWithIdAndAmount & {
  fAssetId: number;
  lendingAppId: number;
};

export interface FolksLendingPool {
  appId: number;
  managerAppId: number;
  depositInterestRate: bigint;
  depositInterestIndex: bigint;
  lastUpdate: number;
}
