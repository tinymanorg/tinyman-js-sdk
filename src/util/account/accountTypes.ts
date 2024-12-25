import {modelsv2} from "algosdk";

export type AccountInformationData = Pick<
  modelsv2.Account,
  | "address"
  | "amount"
  | "amountWithoutPendingRewards"
  | "appsTotalSchema"
  | "createdApps"
  | "createdAssets"
  | "pendingRewards"
  | "rewardBase"
  | "rewards"
  | "round"
  | "status"
  | "minBalance"
  | "appsTotalExtraPages"
> &
  Required<Pick<modelsv2.Account, "appsLocalState">> & {
    assets: Pick<modelsv2.AssetHolding, "amount" | "assetId" | "isFrozen">[];
  };

export interface AccountExcessWithinPool {
  excessAsset1: bigint;
  excessAsset2: bigint;
  excessPoolTokens: bigint;
}

export interface AccountExcess {
  poolAddress: string;
  assetID: number;
  amount: number;
}
