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
  getAppCallTxnNoteWithClientName(
    contractVersion: ContractVersionValue,
    extraData?: Record<string, string>
  ): Uint8Array {
    const versionMarker =
      contractVersion === CONTRACT_VERSION.V1_1 ? "v1" : contractVersion;
    const data = JSON.stringify({origin: this.clientName, ...extraData});

    return encodeString(`tinyman/${versionMarker}:j${data}`);
  }
}

export const tinymanJSSDKConfig = new TinymanJSSDKConfig();
