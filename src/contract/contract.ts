import * as ascJson from "./asc.json";

import {toByteArray} from "base64-js";
import {LogicSigAccount} from "algosdk";

type ValidatorApp = typeof ascJson.contracts.validator_app;
type PoolLogicSig = typeof ascJson.contracts.pool_logicsig;
type PoolLogicSigVariables = PoolLogicSig["logic"]["variables"];

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
  private templateVariables: PoolLogicSigVariables;

  validatorApprovalContract: Uint8Array;
  validatorClearStateContract: Uint8Array;

  schema: ValidatorAppSchema;

  constructor(validatorApp: ValidatorApp, poolLogicSig: PoolLogicSig) {
    this.poolLogicSigContractTemplate = poolLogicSig.logic.bytecode;
    this.templateVariables = poolLogicSig.logic.variables;

    this.validatorApprovalContract = toByteArray(validatorApp.approval_program.bytecode);
    this.validatorClearStateContract = toByteArray(validatorApp.clear_program.bytecode);

    this.schema = {
      numLocalInts: validatorApp.local_state_schema.num_uints,
      numLocalByteSlices: validatorApp.local_state_schema.num_byte_slices,
      numGlobalInts: validatorApp.global_state_schema.num_uints,
      numGlobalByteSlices: validatorApp.global_state_schema.num_byte_slices
    };
  }

  getPoolLogicSig({
    validatorAppID,
    asset1ID,
    asset2ID
  }: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
  }): {addr: string; program: Uint8Array} {
    if (asset1ID === asset2ID) {
      throw new Error("Assets are the same");
    }

    if (asset2ID > asset1ID) {
      const tmp = asset1ID;

      asset1ID = asset2ID;
      asset2ID = tmp;
    }

    let programArray = Array.from(toByteArray(this.poolLogicSigContractTemplate));

    const variables = {
      asset_id_1: asset1ID,
      asset_id_2: asset2ID,
      validator_app_id: validatorAppID
    };

    let offset = 0;

    this.templateVariables.sort((a, b) => a.index - b.index);
    for (let i = 0; i < this.templateVariables.length; i++) {
      const v = this.templateVariables[i];
      let name = v.name.split("TMPL_")[1].toLowerCase();
      let value = variables[name];
      let start = v.index - offset;
      let end = start + v.length;
      // All of the template variables are ints
      let value_encoded = encodeVarInt(value);
      let diff = v.length - value_encoded.length;

      offset += diff;

      programArray = programArray
        .slice(0, start)
        .concat(value_encoded)
        .concat(programArray.slice(end));
    }

    const program = new Uint8Array(programArray);

    const lsig = new LogicSigAccount(program);

    return {
      addr: lsig.address(),
      program
    };
  }
}

export const tinymanContract = new TinymanContract(
  ascJson.contracts.validator_app,
  ascJson.contracts.pool_logicsig
);

export const validatorAppSchema = tinymanContract.schema;

function encodeVarInt(number) {
  let buf: number[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let towrite = number & 0x7f;

    number >>= 7;

    if (number) {
      buf.push(towrite | 0x80);
    } else {
      buf.push(towrite);
      break;
    }
  }
  return buf;
}

/* eslint
      no-param-reassign: "off",
      no-bitwise: "off",
      prefer-destructuring: "off"
*/
