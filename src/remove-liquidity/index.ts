import {CONTRACT_VERSION} from "../contract/constants";
import {RemoveLiquidityV1_1} from "./v1_1";
import {RemoveLiquidityV2} from "./v2";

export const RemoveLiquidity = {
  [CONTRACT_VERSION.V1_1]: RemoveLiquidityV1_1,
  [CONTRACT_VERSION.V2]: RemoveLiquidityV2
};
