import {Algodv2, getApplicationAddress} from "algosdk";

import {StructDefinition} from "./types";
import TinymanBaseClient from "./baseClient";
import {SupportedNetwork} from "../../commonTypes";

/**
 * Abstract client for Tinyman applications that may not have an app ID initially
 * This class overrides the base non-nullable properties to allow null values
 */
abstract class TinymanNullableBaseClient extends TinymanBaseClient {
  constructor(
    algod: Algodv2,
    appId: number | null,
    network: SupportedNetwork,
    structs?: Record<string, StructDefinition>
  ) {
    // If appId is null, we temporarily pass a dummy appId to the parent constructor
    // This is a workaround since the parent expects non-null values
    super(algod, appId ?? 0, network, structs);

    // Override the properties with the actual values
    (this as any).appId = appId;
    (this as any).applicationAddress = appId ? getApplicationAddress(appId) : null;
  }

  /**
   * Helper method to check if the app ID is available
   */
  protected isAppIdAvailable(): boolean {
    return this.appId !== null && this.applicationAddress !== null;
  }

  /**
   * Helper method that throws an error if the app ID is not available
   */
  protected requireAppId(): void {
    if (!this.isAppIdAvailable()) {
      throw new Error("Application ID not provided");
    }
  }

  /**
   * Override getGlobal to add null check
   */
  protected getGlobal(key: Uint8Array, defaultValue?: any, appId?: number) {
    const applicationId = appId || this.appId;

    if (!applicationId) {
      throw new Error("Application ID not provided");
    }

    return super.getGlobal(key, defaultValue, applicationId);
  }

  /**
   * Override boxExists to add null check
   */
  protected boxExists(boxName: Uint8Array, appId?: number) {
    const applicationId = appId || this.appId;

    if (!applicationId) {
      throw new Error("Application ID not provided");
    }

    return super.boxExists(boxName, applicationId);
  }

  /**
   * Override getBox to add null check
   */
  protected getBox(boxName: Uint8Array, structName: string, appId?: number) {
    const applicationId = appId || this.appId;

    if (!applicationId) {
      throw new Error("Application ID not provided");
    }

    return super.getBox(boxName, structName, applicationId);
  }
}

export default TinymanNullableBaseClient;
