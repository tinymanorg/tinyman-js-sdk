import algosdk from "algosdk";
import {InitiatorSigner} from "./common-types";
/**
 * Get the Validator App ID for a network.
 *
 * @param client An Algodv2 client.
 *
 * @returns A Promise that resolves to the Validator App ID for the network that client is connected
 *   to.
 */
export declare function getvalidatorAppID(client: any): Promise<number>;
/**
 * Opt into the validator app.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.initiatorAddr The address of the account opting in.
 * @param params.initiatorSigner A function that will sign  transactions from the initiator's
 *   account.
 */
export declare function optIntoValidator({
  client,
  validatorAppID,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  validatorAppID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<void>;
/**
 * Close out of the Validator app. WARNING: Make sure to redeem ALL excess asset amounts
 * before closing out of the validator, otherwise those assets will be returned to Pools.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.initiatorAddr The address of the account closing out.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function closeOutOfValidator({
  client,
  validatorAppID,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  validatorAppID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<void>;
/**
 * Check if an account is opted into the Validator app.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.account The address of the account to check.
 *
 * @returns A promise that resolve to true if and only if the indicated account has opted into the
 *   pool's pair app.
 */
export declare function isOptedIntoValidator({
  client,
  validatorAppID,
  initiatorAddr
}: {
  client: any;
  validatorAppID: number;
  initiatorAddr: string;
}): Promise<boolean>;
export declare function optIntoValidatorIfNecessary({
  client,
  validatorAppID,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  validatorAppID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<void>;
export declare function getValidatorAppCreationTransaction(
  client: any,
  addr: string
): Promise<algosdk.Transaction>;
export declare function sendValidatorAppCreationTransaction(
  client: any,
  stx: any
): Promise<number>;
