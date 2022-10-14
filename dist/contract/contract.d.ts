import { LogicSigAccount } from "algosdk";
import { SupportedNetwork } from "../util/commonTypes";
import { V1_1ValidatorApp, V1_1PoolLogicSig, V2PoolLogicSig, ContractVersionValue } from "./types";
interface ValidatorAppSchema {
    numLocalInts: any;
    numLocalByteSlices: any;
    numGlobalInts: any;
    numGlobalByteSlices: any;
}
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
export declare function getContract(contractVersion: ContractVersionValue): TinymanContractV1_1 | TinymanContractV2;
export {};
