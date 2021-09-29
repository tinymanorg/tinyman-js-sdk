import {Algodv2} from "algosdk";
import {SignerTransaction} from "./common-types";
import {AccountInformation} from "./account/accountTypes";
/**
 * Get the Validator App ID for a network.
 *
 * @param network "mainnet" | "testnet" | "hiponet".
 *
 * @returns the Validator App ID for the network
 */
export declare function getValidatorAppIDForNetwork(
  network: "mainnet" | "testnet" | "hiponet"
): number;
export declare const OPT_IN_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;
export declare function generateOptIntoValidatorTxns({
  client,
  validatorAppID,
  initiatorAddr
}: {
  client: Algodv2;
  validatorAppID: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]>;
export declare const OPT_OUT_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;
export declare function generateOptOutOfValidatorTxns({
  client,
  validatorAppID,
  initiatorAddr
}: {
  client: Algodv2;
  validatorAppID: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]>;
/**
 * Checks if an account is opted into the Validator app.
 *
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.accountAppsLocalState Array of app local states for an account.
 * @returns True if and only if the indicated account has opted into the Validator App.
 */
export declare function isOptedIntoValidator({
  validatorAppID,
  accountAppsLocalState
}: {
  validatorAppID: number;
  accountAppsLocalState: AccountInformation["apps-local-state"];
}): boolean;
