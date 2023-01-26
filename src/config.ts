import {CONTRACT_VERSION} from "./contract/constants";
import {ContractVersionValue} from "./contract/types";
import {encodeString} from "./util/util";

class TinymanJSSDKConfig {
  /** Identifier name of the SDK user */
  clientName: string;

  constructor() {
    this.clientName = "tinyman-js-sdk";
  }

  getClientName() {
    return this.clientName;
  }

  setClientName(name: string) {
    this.clientName = name;
  }

  /**
   * @returns {Uint8Array} - encoded note includings version with client name
   */
  getAppCallTxnNoteWithClientName(contractVersion: ContractVersionValue): Uint8Array {
    const versionMarker =
      contractVersion === CONTRACT_VERSION.V1_1 ? "v1" : contractVersion;

    return encodeString(`tinyman/${versionMarker}:j{"origin":"${this.clientName}"}`);
  }
}

export const tinymanJSSDKConfig = new TinymanJSSDKConfig();
