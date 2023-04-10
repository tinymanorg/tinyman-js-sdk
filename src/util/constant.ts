import {SupportedNetwork} from "./commonTypes";

export const MAX_SLIPPAGE_FRACTION_DIGITS = 6;

// The fee paying transaction at group index 0 should have a note value set to distinguish it from other Pay transactions in the group which might have the exact same value.
export const DEFAULT_FEE_TXN_NOTE = Uint8Array.from([1]);

export const BASE_MINIMUM_BALANCE = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_ASSET = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_APP = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_CREATED_APP = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_EXTRA_APP_PAGE = 100_000;
export const MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA = 50_000;
export const MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE = 28_500;

export const MINIMUM_ADD_LIQUIDITY_AMOUNT = 1000;

export const DEFAULT_WAIT_FOR_CONFIRMATION_ROUNDS = 1000;

export const TINYMAN_ANALYTICS_API_BASE_URLS: Record<
  SupportedNetwork,
  {base: string; v1: string}
> = {
  mainnet: {
    base: "https://mainnet.analytics.tinyman.org/api",
    v1: "https://mainnet.analytics.tinyman.org/api/v1"
  },
  testnet: {
    base: "https://testnet.analytics.tinyman.org/api",
    v1: "https://testnet.analytics.tinyman.org/api/v1"
  }
};
