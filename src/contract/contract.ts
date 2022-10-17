import * as ascJson_v1_1 from "./asc/v1_1.json";
import * as ascJson_v2 from "./asc/v2.json";

import {toByteArray} from "base64-js";
import {LogicSigAccount} from "algosdk";

import {SupportedNetwork} from "../util/commonTypes";
import {
  generateLogicSigAccountForV1_1Pool,
  GenerateLogicSigAccountForV1_1PoolParams,
  generateLogicSigAccountForV2Pool,
  GenerateLogicSigAccountForV2PoolParams
} from "./contractLogicSigUtils";
import {getValidatorAppID} from "../validator";
import {
  V1_1ValidatorApp,
  V1_1PoolLogicSig,
  V2PoolLogicSig,
  PoolLogicSigVariables,
  V2ValidatorApp
} from "./types";
import {CONTRACT_VERSION} from "./constants";

interface ValidatorAppSchema {
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

export class TinymanContractV1_1 extends BaseTinymanContract<
  V1_1ValidatorApp,
  V1_1PoolLogicSig
> {
  private poolLogicSigContractTemplate: string;
  private templateVariables: PoolLogicSigVariables;

  constructor(validatorApp: V1_1ValidatorApp, poolLogicSig: V1_1PoolLogicSig) {
    super(validatorApp, poolLogicSig);

    this.poolLogicSigContractTemplate = poolLogicSig.logic.bytecode;
    this.templateVariables = poolLogicSig.logic.variables;
  }

  generateLogicSigAccountForPool(params: {
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
  }): LogicSigAccount {
    const {network, asset1ID, asset2ID} = params;
    const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V1_1);
    const generateLogicSigAccountForPoolParams: GenerateLogicSigAccountForV1_1PoolParams =
      {
        validatorAppID,
        asset1ID,
        asset2ID,
        poolLogicSigContractTemplate: this.poolLogicSigContractTemplate,
        templateVariables: this.templateVariables
      };

    return generateLogicSigAccountForV1_1Pool(generateLogicSigAccountForPoolParams);
  }
}

export class TinymanContractV2 extends BaseTinymanContract<
  V1_1ValidatorApp,
  V2PoolLogicSig
> {
  private poolLogicSigContractTemplate: string;

  constructor(validatorApp: V1_1ValidatorApp, poolLogicSig: V2PoolLogicSig) {
    super(validatorApp, poolLogicSig);

    this.poolLogicSigContractTemplate = poolLogicSig.logic.bytecode;
  }

  generateLogicSigAccountForPool(params: {
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
  }): LogicSigAccount {
    const {network, asset1ID, asset2ID} = params;
    const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
    const generateLogicSigAccountForPoolParams: GenerateLogicSigAccountForV2PoolParams = {
      validatorAppID,
      asset1ID,
      asset2ID,
      poolLogicSigContractTemplate: this.poolLogicSigContractTemplate
    };

    return generateLogicSigAccountForV2Pool(generateLogicSigAccountForPoolParams);
  }
}

export const tinymanContract_v1_1 = new TinymanContractV1_1(
  ascJson_v1_1.contracts.validator_app,
  ascJson_v1_1.contracts.pool_logicsig
);

export const tinymanContract_v2 = new TinymanContractV2(
  ascJson_v2.contracts.validator_app,
  ascJson_v2.contracts.pool_logicsig
);
