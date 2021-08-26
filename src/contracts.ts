import * as ascJson from "./asc.json";

import {toByteArray} from "base64-js";
import {makeLogicSig} from "algosdk";

const validator_app = ascJson.contracts.validator_app;
const pool_logicsig = ascJson.contracts.pool_logicsig;

const poolLogicSigContractTemplate = pool_logicsig.logic.bytecode;
const templateVariables = pool_logicsig.logic.variables;

export const validatorApprovalContract = toByteArray(
  validator_app.approval_program.bytecode
);
export const validatorClearStateContract = toByteArray(
  validator_app.clear_program.bytecode
);

export const VALIDATOR_APP_SCHEMA = {
  numLocalInts: validator_app.local_state_schema.num_uints,
  numLocalByteSlices: validator_app.local_state_schema.num_byte_slices,
  numGlobalInts: validator_app.global_state_schema.num_uints,
  numGlobalByteSlices: validator_app.global_state_schema.num_byte_slices
};

export function encodeVarInt(number) {
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

export function getPoolLogicSig({
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

  let programArray = Array.from(toByteArray(poolLogicSigContractTemplate));

  const variables = {
    asset_id_1: asset1ID,
    asset_id_2: asset2ID,
    validator_app_id: validatorAppID
  };

  let offset = 0;

  templateVariables.sort((a, b) => a.index - b.index);
  for (let i = 0; i < templateVariables.length; i++) {
    const v = templateVariables[i];
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

  const lsig = makeLogicSig(program);

  return {
    addr: lsig.address(),
    program
  };
}

/* eslint
      no-param-reassign: "off",
      no-bitwise: "off",
      prefer-destructuring: "off"
*/
