/**
 * These utils are separated from `contract/utils.ts` to avoid circular dependency.
 */
import {LogicSigAccount} from "algosdk";
import {toByteArray} from "base64-js";

import {PoolLogicSigVariables} from "./types";

export interface GenerateLogicSigAccountForV1_1PoolParams {
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  poolLogicSigContractTemplate: string;
  templateVariables: PoolLogicSigVariables;
}

export type GenerateLogicSigAccountForV2PoolParams = Omit<
  GenerateLogicSigAccountForV1_1PoolParams,
  "templateVariables"
>;

export function generateLogicSigAccountForV1_1Pool(
  params: GenerateLogicSigAccountForV1_1PoolParams
): LogicSigAccount {
  const {validatorAppID, poolLogicSigContractTemplate, templateVariables} = params;
  let {asset1ID, asset2ID} = params;

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

  return new LogicSigAccount(program);
}

export function generateLogicSigAccountForV2Pool(
  params: GenerateLogicSigAccountForV2PoolParams
): LogicSigAccount {
  const {validatorAppID, poolLogicSigContractTemplate} = params;
  let {asset1ID, asset2ID} = params;

  if (asset1ID === asset2ID) {
    throw new Error("Assets are the same");
  }

  if (asset2ID > asset1ID) {
    const tmp = asset1ID;

    asset1ID = asset2ID;
    asset2ID = tmp;
  }

  let programArray = Array.from(toByteArray(poolLogicSigContractTemplate));

  const validatorAppIdByteArray = Array.from(encodeVarInt(validatorAppID));
  const asset1IDByteArray = Array.from(encodeVarInt(asset1ID));
  const asset2IDByteArray = Array.from(encodeVarInt(asset2ID));

  programArray
    .slice(0, 3)
    .concat([...validatorAppIdByteArray, ...asset1IDByteArray, ...asset2IDByteArray])
    .concat(programArray.slice(27));

  const program = new Uint8Array(programArray);

  return new LogicSigAccount(program);
}

export function encodeVarInt(number) {
  let buf: number[] = [];

  /* eslint-disable no-bitwise */
  /* eslint-disable no-constant-condition */
  /* eslint-disable no-param-reassign */
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
  /* eslint-enable */

  return buf;
}
