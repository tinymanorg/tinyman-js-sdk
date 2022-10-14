import { LogicSigAccount } from "algosdk";
import { ContractVersionValue, PoolLogicSigVariables } from "./contract";
interface GenerateLogicSigAccountForV1_1PoolParams {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
    poolLogicSigContractTemplate: string;
    templateVariables: PoolLogicSigVariables;
}
declare type GenerateLogicSigAccountForV2PoolParams = Omit<GenerateLogicSigAccountForV1_1PoolParams, "templateVariables">;
declare function generateLogicSigAccountForV1_1Pool(params: GenerateLogicSigAccountForV1_1PoolParams): LogicSigAccount;
declare function generateLogicSigAccountForV2Pool(params: GenerateLogicSigAccountForV2PoolParams): LogicSigAccount;
declare function getIsV2ContractVersion(contractVersion: ContractVersionValue): boolean;
declare function getContract(contractVersion: ContractVersionValue): import("./contract").TinymanContractV2 | import("./contract").TinymanContractV1_1;
export { generateLogicSigAccountForV1_1Pool, generateLogicSigAccountForV2Pool, GenerateLogicSigAccountForV1_1PoolParams, GenerateLogicSigAccountForV2PoolParams, getIsV2ContractVersion, getContract };
