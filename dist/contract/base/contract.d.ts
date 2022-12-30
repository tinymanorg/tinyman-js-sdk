import { LogicSigAccount } from "algosdk";
import { SupportedNetwork } from "../../util/commonTypes";
import { V1_1ValidatorApp } from "../v1_1/types";
import { V2ValidatorApp } from "../v2/types";
export interface ValidatorAppSchema {
    numLocalInts: number;
    numLocalByteSlices: number;
    numGlobalInts: number;
    numGlobalByteSlices: number;
}
export declare abstract class BaseTinymanContract<ValidatorApp extends V1_1ValidatorApp | V2ValidatorApp> {
    schema: ValidatorAppSchema;
    constructor(validatorApp: ValidatorApp);
    abstract generateLogicSigAccountForPool(params: {
        network: SupportedNetwork;
        asset1ID: number;
        asset2ID: number;
    }): LogicSigAccount;
}
