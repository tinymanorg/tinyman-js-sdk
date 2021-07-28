import algosdk from "algosdk";

export interface AccountAsset {
  amount: number;
  "asset-id": number;
  creator: string;
  "is-frozen": boolean;
}

export interface AlgorandMobileApiAsset {
  asset_id: number;
  name: string;
  unit_name: string;
  is_verified: boolean;
  fraction_decimals: number;
}

export interface AccountInformationData {
  address: string;
  amount: number;
  "amount-without-pending-rewards": number;
  "apps-local-state": {
    id: number;
    "key-value"?: {
      key: string;
      value: {
        type: 1 | 2;
        bytes: string;
        uint: number;
      };
    }[];
    schema: {"num-byte-slice": number; "num-uint": number};
  }[];
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

export type InitiatorSigner = (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
