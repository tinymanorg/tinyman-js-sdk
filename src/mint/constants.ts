import {CONTRACT_VERSION} from "../contract/constants";
import {encodeString} from "../util/util";

const ADD_LIQUIDITY_ENCODED = encodeString("add_liquidity");

export const V2_MINT_INNER_TXN_COUNT = {
  INITIAL_LIQUIDITY: 1,
  SINGLE_ASSET_MODE: 2,
  FLEXIBLE_MODE: 2
};

export const LOCKED_POOL_TOKENS = 1000;

export const MINT_APP_CALL_ARGUMENTS = {
  [CONTRACT_VERSION.V1_1]: [encodeString("mint")],
  [CONTRACT_VERSION.V2]: {
    INITIAL_LIQUIDITY: [encodeString("add_initial_liquidity")],
    SINGLE_ASSET_MODE: [ADD_LIQUIDITY_ENCODED, encodeString("single")],
    FLEXIBLE_MODE: [ADD_LIQUIDITY_ENCODED, encodeString("flexible")]
  }
};
