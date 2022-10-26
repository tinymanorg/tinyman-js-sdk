import * as V1_1PoolUtils from "./v1_1";
import * as V2PoolUtils from "./v2";
import * as commonPoolUtils from "./common";
import {CONTRACT_VERSION} from "../../contract/constants";

export const poolUtils = {
  [CONTRACT_VERSION.V1_1]: {
    ...V1_1PoolUtils,
    ...commonPoolUtils
  },
  [CONTRACT_VERSION.V2]: {
    ...V2PoolUtils,
    ...commonPoolUtils
  },
  ...commonPoolUtils
};
