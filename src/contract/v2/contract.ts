import * as ascJson_v2 from "./asc.json";

import {encodeUint64, LogicSigAccount} from "algosdk";

import {SupportedNetwork} from "../../util/commonTypes";
import {getValidatorAppID} from "../../validator";
import {BaseTinymanContract} from "../base/contract";
import {CONTRACT_VERSION} from "../constants";
import {V2PoolLogicSig, V2ValidatorApp} from "./types";
import {sortAssetIds} from "../../util/asset/assetUtils";

export class TinymanContractV2 extends BaseTinymanContract<V2ValidatorApp> {
  private poolLogicSigContractTemplate: string;

  constructor(validatorApp: V2ValidatorApp, poolLogicSig: V2PoolLogicSig) {
    super(validatorApp);

    this.poolLogicSigContractTemplate = poolLogicSig.logic.bytecode;
  }

  generateLogicSigAccountForPool(params: {
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
  }): LogicSigAccount {
    if (params.asset1ID === params.asset2ID) {
      throw new Error("Assets are the same");
    }

    const {network} = params;
    const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
    const [asset1ID, asset2ID] = sortAssetIds(params.asset1ID, params.asset2ID);

    // Encode required values, and convert them to byte arrays
    const encodedByteArrays = {
      bytes: Array.from(Buffer.from(this.poolLogicSigContractTemplate, "base64")),
      validatorAppId: Array.from(encodeUint64(validatorAppID)),
      asset1ID: Array.from(encodeUint64(asset1ID)),
      asset2ID: Array.from(encodeUint64(asset2ID))
    };

    // Concat byte arrays (we're required to insert validatorAppID and assetIDs in the middle of the byte array)
    const finalProgramArray = [
      ...encodedByteArrays.bytes.slice(0, 3),
      ...encodedByteArrays.validatorAppId.slice(0, 8),
      ...encodedByteArrays.asset1ID.slice(0, 8),
      ...encodedByteArrays.asset2ID.slice(0, 8),
      ...encodedByteArrays.bytes.slice(27)
    ];

    // Finally, create the logic signature account using the final byte array
    return new LogicSigAccount(new Uint8Array(finalProgramArray));
  }
}

export const tinymanContract_v2 = new TinymanContractV2(
  ascJson_v2.contracts.validator_app,
  ascJson_v2.contracts.pool_logicsig
);
