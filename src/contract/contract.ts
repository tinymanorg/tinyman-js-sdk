import * as ascJson_v1_1 from "./asc/v1_1.json";
import * as ascJson_v2 from "./asc/v2.json";

import {toByteArray} from "base64-js";
import {LogicSigAccount} from "algosdk";

import {SupportedNetwork} from "../util/commonTypes";
import {
  GenerateLogicSigAccountForPoolParams,
  generateLogicSigAccountForV1_1Pool,
  generateLogicSigAccountForV2Pool
} from "./utils";
import {getValidatorAppID} from "../validator";

type V1_1ValidatorApp = typeof ascJson_v1_1.contracts.validator_app;
type V1_1PoolLogicSig = typeof ascJson_v1_1.contracts.pool_logicsig;
export type V1_1PoolLogicSigVariables = V1_1PoolLogicSig["logic"]["variables"];

// type V2ValidatorApp = typeof ascJson_v2.contracts.validator_app;
type V2PoolLogicSig = typeof ascJson_v2.contracts.pool_logicsig;

type PoolLogicSig = V1_1PoolLogicSig | V2PoolLogicSig;
type PoolLogicSigVariables = V1_1PoolLogicSigVariables;

interface ValidatorAppSchema {
  numLocalInts: any;
  numLocalByteSlices: any;
  numGlobalInts: any;
  numGlobalByteSlices: any;
}

export enum ContractVersion {
  V1_1 = "v1_1",
  V2 = "v2"
}

export class TinymanContract {
  private poolLogicSigContractTemplate: string;
  private templateVariables: PoolLogicSigVariables | undefined;

  validatorApprovalContract: Uint8Array;
  validatorClearStateContract: Uint8Array;

  schema: ValidatorAppSchema;

  constructor(validatorApp: V1_1ValidatorApp, poolLogicSig: PoolLogicSig) {
    this.poolLogicSigContractTemplate = poolLogicSig.logic.bytecode;

    //  TODO: test this "in" operator
    if ("variables" in poolLogicSig.logic) {
      this.templateVariables = poolLogicSig.logic.variables;
    }

    this.validatorApprovalContract = toByteArray(validatorApp.approval_program.bytecode);
    this.validatorClearStateContract = toByteArray(validatorApp.clear_program.bytecode);

    this.schema = {
      numLocalInts: validatorApp.local_state_schema.num_uints,
      numLocalByteSlices: validatorApp.local_state_schema.num_byte_slices,
      numGlobalInts: validatorApp.global_state_schema.num_uints,
      numGlobalByteSlices: validatorApp.global_state_schema.num_byte_slices
    };
  }

  generateLogicSigAccountForPool(params: {
    network: SupportedNetwork;
    contractVersion: ContractVersion;
    asset1ID: number;
    asset2ID: number;
  }): LogicSigAccount {
    const {contractVersion, network, asset1ID, asset2ID} = params;
    const validatorAppID = getValidatorAppID(network, contractVersion);
    const generateLogicSicForPoolParams: GenerateLogicSigAccountForPoolParams = {
      validatorAppID,
      asset1ID,
      asset2ID,
      poolLogicSigContractTemplate: this.poolLogicSigContractTemplate,
      templateVariables: this.templateVariables
    };

    return contractVersion === ContractVersion.V1_1
      ? generateLogicSigAccountForV1_1Pool(generateLogicSicForPoolParams)
      : generateLogicSigAccountForV2Pool(generateLogicSicForPoolParams);
  }
}

export const tinymanContract_v1_1 = new TinymanContract(
  ascJson_v1_1.contracts.validator_app,
  ascJson_v1_1.contracts.pool_logicsig
);

export const tinymanContract_v2 = new TinymanContract(
  ascJson_v1_1.contracts.validator_app,
  ascJson_v2.contracts.pool_logicsig
);

/* eslint
      no-param-reassign: "off",
      no-bitwise: "off",
      prefer-destructuring: "off"
*/
