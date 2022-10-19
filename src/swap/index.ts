import {SwapV1_1} from "./v1_1";
import {SwapV2} from "./v2";
import {execute, generateTxns, getQuote, signTxns} from "./utils";
import {CONTRACT_VERSION} from "../contract/constants";

export const Swap = {
  [CONTRACT_VERSION.V1_1]: SwapV1_1,
  [CONTRACT_VERSION.V2]: SwapV2,
  getQuote,
  generateTxns,
  signTxns,
  execute
};
