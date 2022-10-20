import {LogicSigAccount} from "algosdk";
import {toByteArray} from "base64-js";

import {SupportedNetwork} from "../../util/commonTypes";
import {V1_1PoolLogicSig, V1_1ValidatorApp} from "../v1_1/types";
import {V2PoolLogicSig, V2ValidatorApp} from "../v2/types";

export interface ValidatorAppSchema {
  numLocalInts: any;
  numLocalByteSlices: any;
  numGlobalInts: any;
  numGlobalByteSlices: any;
}

export abstract class BaseTinymanContract<
  ValidatorApp extends V1_1ValidatorApp | V2ValidatorApp,
  PoolLogicSig extends V1_1PoolLogicSig | V2PoolLogicSig
> {
  validatorApprovalContract: Uint8Array;
  validatorClearStateContract: Uint8Array;

  schema: ValidatorAppSchema;

  constructor(validatorApp: ValidatorApp, _poolLogicSig: PoolLogicSig) {
    this.validatorApprovalContract = toByteArray(validatorApp.approval_program.bytecode);
    this.validatorClearStateContract = toByteArray(validatorApp.clear_program.bytecode);

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
