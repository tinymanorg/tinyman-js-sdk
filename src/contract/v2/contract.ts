import * as ascJson_v2 from "./asc.json";

import {LogicSigAccount} from "algosdk";
import {toByteArray} from "base64-js";

import {SupportedNetwork} from "../../util/commonTypes";
import {encodeInteger} from "../../util/util";
import {getValidatorAppID} from "../../validator";
import {BaseTinymanContract} from "../base/contract";
import {CONTRACT_VERSION} from "../constants";
import {V2PoolLogicSig, V2ValidatorApp} from "./types";

export class TinymanContractV2 extends BaseTinymanContract<
  V2ValidatorApp,
  V2PoolLogicSig
> {
  private poolLogicSigContractTemplate: string;

  constructor(validatorApp: V2ValidatorApp, poolLogicSig: V2PoolLogicSig) {
    super(validatorApp, poolLogicSig);

    this.poolLogicSigContractTemplate = poolLogicSig.logic.bytecode;
  }

  generateLogicSigAccountForPool(params: {
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
  }): LogicSigAccount {
    const {network} = params;
    let {asset1ID, asset2ID} = params;
    const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);

    if (asset1ID === asset2ID) {
      throw new Error("Assets are the same");
    }

    if (asset2ID > asset1ID) {
      const tmp = asset1ID;

      asset1ID = asset2ID;
      asset2ID = tmp;
    }

    let programArray = Array.from(toByteArray(this.poolLogicSigContractTemplate));

    const validatorAppIdByteArray = Array.from(encodeInteger(validatorAppID));
    const asset1IDByteArray = Array.from(encodeInteger(asset1ID));
    const asset2IDByteArray = Array.from(encodeInteger(asset2ID));

    programArray
      .slice(0, 3)
      .concat([...validatorAppIdByteArray, ...asset1IDByteArray, ...asset2IDByteArray])
      .concat(programArray.slice(27));

    const program = new Uint8Array(programArray);

    return new LogicSigAccount(program);
  }
}

export const tinymanContract_v2 = new TinymanContractV2(
  ascJson_v2.contracts.validator_app,
  ascJson_v2.contracts.pool_logicsig
);
