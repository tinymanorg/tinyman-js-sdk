import {CONTRACT_VERSION} from "../contract/contract";
import {BootstrapV1_1} from "./v1_1";
import {BootstrapV2} from "./v2";

export const Bootstrap = {
  [CONTRACT_VERSION.V1_1]: BootstrapV1_1,
  [CONTRACT_VERSION.V2]: BootstrapV2,
  generateTxns: BootstrapV2.generateTxns,
  signTxns: BootstrapV2.signTxns,
  execute: BootstrapV2.execute
};
