import {BootstrapV1_1} from "./v1_1";
import {BootstrapV2} from "./v2";
import {CONTRACT_VERSION} from "../contract/constants";
import {
  calculateBootstrapFundingTxnAmount,
  execute,
  generateTxns,
  signTxns
} from "./utils";

export const Bootstrap = {
  [CONTRACT_VERSION.V1_1]: BootstrapV1_1,
  [CONTRACT_VERSION.V2]: BootstrapV2,
  generateTxns,
  signTxns,
  execute,
  calculateBootstrapFundingTxnAmount
};
