import {TinymanAnalyticsApiAsset} from "./common-types";

export const MAX_SLIPPAGE_FRACTION_DIGITS = 6;

export const TESTNET_VALIDATOR_APP_ID = 21580889;
export const HIPONET_VALIDATOR_APP_ID = 448;
export const MAINNET_VALIDATOR_APP_ID = 0;

export const ALGO_ASSET_ID = 0;

export const ALGO_ASSET: TinymanAnalyticsApiAsset = {
  id: `${ALGO_ASSET_ID}`,
  name: "Algorand",
  unit_name: "ALGO",
  decimals: 6,
  url: "https://algorand.org",
  is_liquidity_token: false
};

export const LIQUIDITY_TOKEN_UNIT_NAME = "TM1POOL";
