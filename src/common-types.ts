import algosdk from "algosdk";

export interface AccountAsset {
  amount: number;
  "asset-id": number;
  creator: string;
  "is-frozen": boolean;
}

export interface TinymanAnalyticsApiAsset {
  id: string;
  is_liquidity_token: boolean;
  name: string;
  unit_name: string;
  decimals: number;
  url: string;
}

export type InitiatorSigner = (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>;
