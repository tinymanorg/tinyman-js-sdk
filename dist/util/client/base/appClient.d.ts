import { Algodv2 } from "algosdk";
import { StructDefinition } from "./types";
import TinymanBaseClient from "./baseClient";
import { SupportedNetwork } from "../../commonTypes";
/**
 * Abstract client for Tinyman applications that may not have an app ID initially
 * This class overrides the base non-nullable properties to allow null values
 */
declare abstract class TinymanNullableAppClient extends TinymanBaseClient {
    constructor(algod: Algodv2, appId: number | null, network: SupportedNetwork, structs?: Record<string, StructDefinition>);
    /**
     * Helper method to check if the app ID is available
     */
    protected isAppIdAvailable(): boolean;
    /**
     * Helper method that throws an error if the app ID is not available
     */
    protected requireAppId(): void;
    /**
     * Override getGlobal to add null check
     */
    protected getGlobal(key: Uint8Array, defaultValue?: any, appId?: number): Promise<any>;
    /**
     * Override boxExists to add null check
     */
    protected boxExists(boxName: Uint8Array, appId?: number): Promise<boolean>;
    /**
     * Override getBox to add null check
     */
    protected getBox(boxName: Uint8Array, structName: string, appId?: number): Promise<import("./utils").Struct | null>;
}
export default TinymanNullableAppClient;
