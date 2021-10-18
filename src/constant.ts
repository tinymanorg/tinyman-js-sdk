import {TinymanAnalyticsApiAsset} from "./common-types";

export const MAX_SLIPPAGE_FRACTION_DIGITS = 6;

export const TESTNET_VALIDATOR_APP_ID = 21580889;
export const HIPONET_VALIDATOR_APP_ID = 448;
export const MAINNET_VALIDATOR_APP_ID = 350338509;

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

// The fee paying transaction at group index 0 should have a note value set to distinguish it from other Pay transactions in the group which might have the exact same value.
export const DEFAULT_FEE_TXN_NOTE = Uint8Array.from([1]);

export const BASE_MINIMUM_BALANCE = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_ASSET = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_APP = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_CREATED_APP = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_EXTRA_APP_PAGE = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA = 50000;
export const MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE = 28500;
