export interface AccountAsset {
  amount: number;
  "asset-id": number;
  creator: string;
  "is-frozen": boolean;
}

export interface AccountInformationData {
  address: string;
  amount: number;
  "amount-without-pending-rewards": number;
  "apps-local-state": {id: number; "key-value": any[]}[];
  "apps-total-schema": {"num-byte-slice": number; "num-uint": number};
  assets: AccountAsset[];
  "created-apps": any[];
  "created-assets": Omit<AccountAsset, "asset-id"> & {index: number}[];
  "pending-rewards": number;
  "reward-base": number;
  rewards: number;
  round: number;
  status: "Offline";
}
