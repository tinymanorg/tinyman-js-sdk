import {CONTRACT_VERSION} from "./constants";
import {tinymanContract_v2, tinymanContract_v1_1} from "./contract";
import {ContractVersionValue} from "./types";

export function getIsV2ContractVersion(contractVersion: ContractVersionValue) {
  return contractVersion === CONTRACT_VERSION.V2;
}

export function getContract(contractVersion: ContractVersionValue) {
  return getIsV2ContractVersion(contractVersion)
    ? tinymanContract_v2
    : tinymanContract_v1_1;
}
