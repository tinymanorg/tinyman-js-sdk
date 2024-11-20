import {modelsv2} from "algosdk";

export type AccountInformation = modelsv2.Account;

export type AccountInformationData = AccountInformation & {
  minimum_required_balance: bigint;
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
