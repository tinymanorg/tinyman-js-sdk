import {CONTRACT_VERSION} from "../../contract/constants";

export const DECODED_APP_STATE_KEYS = {
  [CONTRACT_VERSION.V1_1]: {
    asset1: "a1",
    asset2: "a2"
  },
  [CONTRACT_VERSION.V2]: {
    asset1: "asset_1_id",
    asset2: "asset_2_id",
    poolTokenID: "pool_token_asset_id",
    issuedPoolTokens: "issued_pool_tokens",
    asset1Reserves: "asset_1_reserves",
    asset2Reserves: "asset_2_reserves",
    asset1ProtocolFees: "asset_1_protocol_fees",
    asset2ProtocolFees: "asset_2_protocol_fees",
    totalFeeShare: "total_fee_share",
    protocolFeeRatio: "protocol_fee_ratio",
    cumulativePriceUpdateTimeStamp: "cumulative_price_update_timestamp"
  }
};

/**
 * A small portion of the pool is reserved (locked) for possible rounding errors.
 */
export const V2_LOCKED_POOL_TOKENS = 1000;
