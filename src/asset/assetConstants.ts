import WebStorage from "../web-storage/WebStorage";
import {TinymanAnalyticsApiAsset} from "./assetModels";

const cachedAssetsStoredValue = WebStorage.getFromWebStorage(
  WebStorage.STORED_KEYS.TINYMAN_CACHED_ASSETS
);

export const CACHED_ASSETS: Record<
  string,
  {asset: TinymanAnalyticsApiAsset; isDeleted: boolean}
> = (typeof cachedAssetsStoredValue === "object" ? cachedAssetsStoredValue : null) || {};

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

export const LIQUIDITY_TOKEN_UNIT_NAME = "TM1POOL";
