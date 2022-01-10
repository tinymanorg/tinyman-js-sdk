import * as ascJson from "./asc.json";
declare type ValidatorApp = typeof ascJson.contracts.validator_app;
declare type PoolLogicSig = typeof ascJson.contracts.pool_logicsig;
interface ValidatorAppSchema {
  numLocalInts: any;
  numLocalByteSlices: any;
  numGlobalInts: any;
  numGlobalByteSlices: any;
}
export declare class TinymanContract {
  private poolLogicSigContractTemplate;
  private templateVariables;
  validatorApprovalContract: Uint8Array;
  validatorClearStateContract: Uint8Array;
  schema: ValidatorAppSchema;
  constructor(validatorApp: ValidatorApp, poolLogicSig: PoolLogicSig);
  getPoolLogicSig({
    validatorAppID,
    asset1ID,
    asset2ID
  }: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
  }): {
    addr: string;
    program: Uint8Array;
  };
}
export declare const tinymanContract: TinymanContract;
export declare const validatorAppSchema: ValidatorAppSchema;
export {};
