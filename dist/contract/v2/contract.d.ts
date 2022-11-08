import { LogicSigAccount } from "algosdk";
import { SupportedNetwork } from "../../util/commonTypes";
import { BaseTinymanContract } from "../base/contract";
import { V2PoolLogicSig, V2ValidatorApp } from "./types";
export declare class TinymanContractV2 extends BaseTinymanContract<V2ValidatorApp> {
    private poolLogicSigContractTemplate;
    constructor(validatorApp: V2ValidatorApp, poolLogicSig: V2PoolLogicSig);
    generateLogicSigAccountForPool(params: {
        network: SupportedNetwork;
        asset1ID: number;
        asset2ID: number;
    }): LogicSigAccount;
}
export declare const tinymanContract_v2: TinymanContractV2;
