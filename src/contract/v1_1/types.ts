import * as ascJson_v1_1 from "./asc.json";

export type V1_1ValidatorApp = typeof ascJson_v1_1.contracts.validator_app;
export type V1_1PoolLogicSig = typeof ascJson_v1_1.contracts.pool_logicsig;
export type PoolLogicSigVariables = V1_1PoolLogicSig["logic"]["variables"];
