import {Transaction} from "algosdk";
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
  liquidity_in_usd?: null | string;
  last_day_volume_in_usd?: null | string;
  last_day_price_change?: null | string;
}
export interface IndexerAssetInformation {
  asset: {
    "asset-tx-counter": number;
    "created-at": number;
    "created-at-round": number;
    "creation-txid": string;
    deleted: true;
    "destroyed-at-round": number;
    index: number;
    params: IndexerAssetParams;
  };
  "current-round": number;
}
interface IndexerAssetParams {
  "circulating-supply": number;
  clawback: string;
  creator: string;
  decimals: number;
  "default-frozen": boolean;
  freeze: string;
  manager: string;
  name: string;
  reserve: string;
  score: number;
  total: number;
  "unit-name": string;
  url: string;
  verified: boolean;
}
export interface SignerTransaction {
  txn: Transaction;
  /**
   * Optional list of addresses that must sign the transactions.
   * Wallet skips to sign this txn if signers is empty array.
   * If undefined, wallet tries to sign it.
   */
  signers?: string[];
}
export declare type InitiatorSigner = (
  txGroupList: SignerTransaction[][]
) => Promise<Uint8Array[]>;
export declare type SupportedNetwork = "hiponet" | "testnet" | "mainnet";
export {};
