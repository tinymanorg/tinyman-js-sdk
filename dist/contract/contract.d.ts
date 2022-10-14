import * as ascJson_v1_1 from "./asc/v1_1.json";
import * as ascJson_v2 from "./asc/v2.json";
import { LogicSigAccount } from "algosdk";
import { SupportedNetwork } from "../util/commonTypes";
import { ValueOf } from "../util/typeUtils";
export declare type V1_1ValidatorApp = typeof ascJson_v1_1.contracts.validator_app;
export declare type V1_1PoolLogicSig = typeof ascJson_v1_1.contracts.pool_logicsig;
export declare type V1_1PoolLogicSigVariables = V1_1PoolLogicSig["logic"]["variables"];
export declare type V2PoolLogicSig = typeof ascJson_v2.contracts.pool_logicsig;
export declare type PoolLogicSigVariables = V1_1PoolLogicSigVariables;
interface ValidatorAppSchema {
    numLocalInts: any;
    numLocalByteSlices: any;
    numGlobalInts: any;
    numGlobalByteSlices: any;
}
export declare const CONTRACT_VERSION: {
    readonly V1_1: "v1_1";
    readonly V2: "v2";
};
export declare type ContractVersionValue = ValueOf<typeof CONTRACT_VERSION>;
export declare abstract class BaseTinymanContract<ValidatorApp extends V1_1ValidatorApp, PoolLogicSig extends V1_1PoolLogicSig | V2PoolLogicSig> {
    validatorApprovalContract: Uint8Array;
    validatorClearStateContract: Uint8Array;
    schema: ValidatorAppSchema;
    constructor(validatorApp: ValidatorApp, _poolLogicSig: PoolLogicSig);
    abstract generateLogicSigAccountForPool(params: {
        network: SupportedNetwork;
        asset1ID: number;
        asset2ID: number;
    }): LogicSigAccount;
}
export declare class TinymanContractV1_1 extends BaseTinymanContract<V1_1ValidatorApp, V1_1PoolLogicSig> {
    private poolLogicSigContractTemplate;
    private templateVariables;
    constructor(validatorApp: V1_1ValidatorApp, poolLogicSig: V1_1PoolLogicSig);
    generateLogicSigAccountForPool(params: {
        network: SupportedNetwork;
        asset1ID: number;
        asset2ID: number;
    }): LogicSigAccount;
}
export declare class TinymanContractV2 extends BaseTinymanContract<V1_1ValidatorApp, V2PoolLogicSig> {
    private poolLogicSigContractTemplate;
    constructor(validatorApp: V1_1ValidatorApp, poolLogicSig: V2PoolLogicSig);
    generateLogicSigAccountForPool(params: {
        network: SupportedNetwork;
        asset1ID: number;
        asset2ID: number;
    }): LogicSigAccount;
}
export declare const tinymanContract_v1_1: TinymanContractV1_1;
export declare const tinymanContract_v2: TinymanContractV2;
export {};
