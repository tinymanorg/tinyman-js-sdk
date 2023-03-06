import {SupportedNetwork} from "../../../util/commonTypes";

export const SWAP_ROUTER_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 159521633,
  // TODO: Update this when the mainnet app is deployed
  mainnet: 0
};

const TINYMAN_ANALYTICS_API_BASE_URLS: Record<
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

export {TINYMAN_ANALYTICS_API_BASE_URLS};
