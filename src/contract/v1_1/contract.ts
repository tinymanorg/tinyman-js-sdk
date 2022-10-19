import * as ascJson_v1_1 from "./asc.json";

import {LogicSigAccount} from "algosdk";
import {toByteArray} from "base64-js";

import {SupportedNetwork} from "../../util/commonTypes";
import {encodeInteger} from "../../util/util";
import {getValidatorAppID} from "../../validator";
import {BaseTinymanContract} from "../base/contract";
import {CONTRACT_VERSION} from "../constants";
import {PoolLogicSigVariables, V1_1PoolLogicSig, V1_1ValidatorApp} from "./types";

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
    const {network} = params;
    const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V1_1);
    let {asset1ID, asset2ID} = params;

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
      /**
       * TODO: Try using `algosdk.encodeUint64` instead of this function.
       * If it works, remove `encodeInteger`
       */
      // All of the template variables are ints
      let value_encoded = encodeInteger(value);
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
}

export const tinymanContract_v1_1 = new TinymanContractV1_1(
  ascJson_v1_1.contracts.validator_app,
  ascJson_v1_1.contracts.pool_logicsig
);
