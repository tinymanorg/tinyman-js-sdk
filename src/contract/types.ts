import * as ascJson_v1_1 from "./asc/v1_1.json";
import * as ascJson_v2 from "./asc/v2.json";

import {CONTRACT_VERSION} from "./constants";
import {ValueOf} from "../util/typeUtils";

export type V1_1ValidatorApp = typeof ascJson_v1_1.contracts.validator_app;
export type V1_1PoolLogicSig = typeof ascJson_v1_1.contracts.pool_logicsig;
export type V1_1PoolLogicSigVariables = V1_1PoolLogicSig["logic"]["variables"];
export type V2PoolLogicSig = typeof ascJson_v2.contracts.pool_logicsig;
export type PoolLogicSigVariables = V1_1PoolLogicSigVariables;
export type ContractVersionValue = ValueOf<typeof CONTRACT_VERSION>;
