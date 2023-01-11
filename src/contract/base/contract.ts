import {LogicSigAccount} from "algosdk";

import {SupportedNetwork} from "../../util/commonTypes";
import {V1_1ValidatorApp} from "../v1_1/types";
import {V2ValidatorApp} from "../v2/types";

export interface ValidatorAppSchema {
  numLocalInts: number;
  numLocalByteSlices: number;
  numGlobalInts: number;
  numGlobalByteSlices: number;
}

export abstract class BaseTinymanContract<
  ValidatorApp extends V1_1ValidatorApp | V2ValidatorApp
> {
  schema: ValidatorAppSchema;

  constructor(validatorApp: ValidatorApp) {
    this.schema = {
      numLocalInts: validatorApp.local_state_schema.num_uints,
      numLocalByteSlices: validatorApp.local_state_schema.num_byte_slices,
      numGlobalInts: validatorApp.global_state_schema.num_uints,
      numGlobalByteSlices: validatorApp.global_state_schema.num_byte_slices
    };
  }

  abstract generateLogicSigAccountForPool(params: {
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
  }): LogicSigAccount;
}
