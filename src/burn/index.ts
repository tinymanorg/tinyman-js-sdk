import {CONTRACT_VERSION} from "../contract/contract";
import {BurnV1_1} from "./v1_1";
import {BurnV2} from "./v2";

export const Burn = {
  [CONTRACT_VERSION.V1_1]: BurnV1_1,
  [CONTRACT_VERSION.V2]: BurnV2
};
