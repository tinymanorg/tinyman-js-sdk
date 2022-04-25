import {TinymanAnalyticsApiAsset} from "./assetModels";

export const ALGO_ASSET_ID = 0;

export const ALGO_ASSET: TinymanAnalyticsApiAsset = {
  id: `${ALGO_ASSET_ID}`,
  name: "Algorand",
  unit_name: "ALGO",
  decimals: 6,
  url: "https://algorand.org",
  is_liquidity_token: false,
  total_amount: "6615503326932151"
};

export const LIQUIDITY_TOKEN_UNIT_NAME = {
  DEFAULT: "TMPOOL11",
  V1: "TM1POOL"
};
