import {CONTRACT_VERSION} from "../contract/constants";
import * as AddLiquidityV1_1 from "./v1_1";
import * as AddLiquidityV2 from "./v2";

export const AddLiquidity = {
  [CONTRACT_VERSION.V1_1]: AddLiquidityV1_1,
  [CONTRACT_VERSION.V2]: AddLiquidityV2
};
