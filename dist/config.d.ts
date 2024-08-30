import { ContractVersionValue } from "./contract/types";
declare class TinymanJSSDKConfig {
    /** Identifier name of the SDK user */
    clientName: string;
    constructor();
    getClientName(): string;
    setClientName(name: string): void;
    /**
     * @returns {Uint8Array} - encoded note includings version with client name
     */
    getAppCallTxnNoteWithClientName(contractVersion: ContractVersionValue, extraData?: Record<string, string>): Uint8Array;
}
export declare const tinymanJSSDKConfig: TinymanJSSDKConfig;
export {};
