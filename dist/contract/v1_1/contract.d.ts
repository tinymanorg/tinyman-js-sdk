import { LogicSigAccount } from "algosdk";
import { SupportedNetwork } from "../../util/commonTypes";
import { BaseTinymanContract } from "../base/contract";
import { V1_1PoolLogicSig, V1_1ValidatorApp } from "./types";
export declare class TinymanContractV1_1 extends BaseTinymanContract<V1_1ValidatorApp> {
    private poolLogicSigContractTemplate;
    private templateVariables;
    constructor(validatorApp: V1_1ValidatorApp, poolLogicSig: V1_1PoolLogicSig);
    generateLogicSigAccountForPool(params: {
        network: SupportedNetwork;
        asset1ID: number;
        asset2ID: number;
    }): LogicSigAccount;
}
export declare const tinymanContract_v1_1: TinymanContractV1_1;
