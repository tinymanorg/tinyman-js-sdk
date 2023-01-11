import {CONTRACT_VERSION} from "./constants";
import {ContractVersionValue} from "./types";
import {tinymanContract_v1_1} from "./v1_1/contract";
import {tinymanContract_v2} from "./v2/contract";

export function getIsV2ContractVersion(contractVersion: ContractVersionValue) {
  return contractVersion === CONTRACT_VERSION.V2;
}

export function getContract(contractVersion: ContractVersionValue) {
  return getIsV2ContractVersion(contractVersion)
    ? tinymanContract_v2
    : tinymanContract_v1_1;
}
