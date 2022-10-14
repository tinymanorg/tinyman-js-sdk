import { LogicSigAccount } from "algosdk";
import { PoolLogicSigVariables } from "./types";
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
export { generateLogicSigAccountForV1_1Pool, generateLogicSigAccountForV2Pool, GenerateLogicSigAccountForV1_1PoolParams, GenerateLogicSigAccountForV2PoolParams };
