import {AssetHolding} from "algosdk/dist/types/client/v2/algod/models/types";

export type AccountAsset = Pick<AssetHolding, "amount" | "assetId" | "isFrozen">;
export interface TinymanAnalyticsApiAsset {
  id: string;
  is_liquidity_token: boolean;
  name: string;
  unit_name: string;
  decimals: number;
  url: string;
  total_amount: string;
  clawback_address: string;
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

export interface AssetWithIdAndAmount {
  id: number;
  amount: bigint;
}

export interface AssetWithIdAndDecimals {
  id: number;
  decimals: number;
}

export interface AssetWithAmountAndDecimals {
  amount: bigint;
  decimals: number;
}

export interface AssetWithIdAndAmountAndDecimals {
  id: number;
  amount: bigint;
  decimals: number;
}
