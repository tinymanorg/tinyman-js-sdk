import {CONTRACT_VERSION} from "../../contract/constants";

export const ENCODED_APP_STATE_KEYS = {
  [CONTRACT_VERSION.V1_1]: {
    asset1: btoa("a1"),
    asset2: btoa("a2")
  },
  [CONTRACT_VERSION.V2]: {
    asset1: btoa("asset_1_id"),
    asset2: btoa("asset_2_id"),
    liquidityTokenID: btoa("pool_token_asset_id"),
    totalFeeShare: btoa("total_fee_share")
  }
};
