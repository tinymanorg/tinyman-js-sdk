import {CONTRACT_VERSION} from "../contract/constants";
import {encodeString} from "../util/util";

const ADD_LIQUIDITY_APP_ARG_ENCODED = encodeString("add_liquidity");

export const ADD_LIQUIDITY_APP_CALL_ARGUMENTS = {
  [CONTRACT_VERSION.V1_1]: [encodeString("mint")],
  [CONTRACT_VERSION.V2]: {
    INITIAL_LIQUIDITY: [encodeString("add_initial_liquidity")],
    SINGLE_ASSET_MODE: [ADD_LIQUIDITY_APP_ARG_ENCODED, encodeString("single")],
    FLEXIBLE_MODE: [ADD_LIQUIDITY_APP_ARG_ENCODED, encodeString("flexible")]
  }
};
