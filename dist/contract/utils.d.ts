import { ContractVersionValue } from "./types";
export declare function getIsV2ContractVersion(contractVersion: ContractVersionValue): boolean;
export declare function getContract(contractVersion: ContractVersionValue): import("./contract").TinymanContractV1_1 | import("./contract").TinymanContractV2;
