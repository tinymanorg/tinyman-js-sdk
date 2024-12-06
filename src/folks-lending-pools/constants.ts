import {SupportedNetwork} from "../util/commonTypes";

const SECONDS_IN_YEAR = BigInt(365 * 24 * 60 * 60);
const ONE_14_DP = BigInt(1e14);
const ONE_16_DP = BigInt(1e16);

const FOLKS_WRAPPER_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 548587153,
  mainnet: 1385499515
};

const FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT = 14;

export {
  SECONDS_IN_YEAR,
  ONE_14_DP,
  ONE_16_DP,
  FOLKS_WRAPPER_APP_ID,
  FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT
};
