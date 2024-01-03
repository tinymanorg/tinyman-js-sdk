import {SupportedNetwork} from "../util/commonTypes";

// eslint-disable-next-line no-magic-numbers
const SECONDS_IN_YEAR = BigInt(365 * 24 * 60 * 60);
const ONE_14_DP = BigInt(1e14);
const ONE_16_DP = BigInt(1e16);

const FOLKS_WRAPPER_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 548587153,
  // TODO: Update mainnet vault app id when it is available
  mainnet: NaN
};

export {SECONDS_IN_YEAR, ONE_14_DP, ONE_16_DP, FOLKS_WRAPPER_APP_ID};
