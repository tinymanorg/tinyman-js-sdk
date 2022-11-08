import {CONTRACT_VERSION} from "../contract/constants";
import * as MintV1_1 from "./v1_1";
import * as MintV2 from "./v2";

export const Mint = {
  [CONTRACT_VERSION.V1_1]: MintV1_1,
  [CONTRACT_VERSION.V2]: MintV2
};

export const MINT_PROCESS_TXN_COUNT = 5;
