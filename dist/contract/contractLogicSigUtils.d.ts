/**
 * These utils are separated from `contract/utils.ts` to avoid circular dependency.
 */
import { LogicSigAccount } from "algosdk";
import { PoolLogicSigVariables } from "./types";
export interface GenerateLogicSigAccountForV1_1PoolParams {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
    poolLogicSigContractTemplate: string;
    templateVariables: PoolLogicSigVariables;
}
export declare type GenerateLogicSigAccountForV2PoolParams = Omit<GenerateLogicSigAccountForV1_1PoolParams, "templateVariables">;
export declare function generateLogicSigAccountForV1_1Pool(params: GenerateLogicSigAccountForV1_1PoolParams): LogicSigAccount;
export declare function generateLogicSigAccountForV2Pool(params: GenerateLogicSigAccountForV2PoolParams): LogicSigAccount;
export declare function encodeVarInt(number: any): number[];
