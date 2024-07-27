import {SupportedNetwork} from "../commonTypes";
import {TinymanAnalyticsApiAsset} from "./assetModels";

export const ALGO_ASSET_ID = 0;

export const ALGO_ASSET: TinymanAnalyticsApiAsset = {
  id: `${ALGO_ASSET_ID}`,
  name: "Algorand",
  unit_name: "ALGO",
  decimals: 6,
  url: "https://algorand.org",
  is_liquidity_token: false,
  total_amount: "6615503326932151",
  clawback_address: ""
};

export const POOL_TOKEN_UNIT_NAME = {
  V1: "TM1POOL",
  V1_1: "TMPOOL11",
  V2: "TMPOOL2"
};

export const TINY_ASSET_ID: Record<SupportedNetwork, number> = {
  testnet: 258703304,
  // TODO: Update mainnet tiny asset id when it is available
  mainnet: NaN
};
