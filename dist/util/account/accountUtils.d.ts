import { Algodv2, IntDecoding } from "algosdk";
import { V1PoolInfo } from "../pool/poolTypes";
import { AccountExcessWithinPool, AccountInformation, AccountInformationData, AccountExcess } from "./accountTypes";
import { ContractVersionValue } from "../../contract/types";
export declare function getAccountInformation(client: Algodv2, address: string, intDecoding?: IntDecoding): Promise<AccountInformationData>;
/**
 * @returns the decoded application local state object (both keys and values are decoded)
 */
export declare function getDecodedAccountApplicationLocalState(accountInfo: AccountInformationData, validatorAppID: number): Record<string, string | number> | null;
export declare function calculateAccountMinimumRequiredBalance(account: AccountInformation): number;
export declare function hasSufficientMinimumBalance(accountData: AccountInformationData): boolean;
/**
 * Finds the excess amounts accumulated for an account within a pool
 * @param params.client An Algodv2 client.
 * @param params.pool Pool info.
 * @param params.validatorAppID Validator APP ID
 * @returns The excess amounts accumulated for an account within the pool
 */
export declare function getAccountExcessWithinPool({ client, pool, accountAddr }: {
    client: Algodv2;
    pool: V1PoolInfo;
    accountAddr: string;
}): Promise<AccountExcessWithinPool>;
/**
 * Generates a list of excess amounts accumulated within an account.
 * @param params.client An Algodv2 client.
 * @param params.accountAddr The address of the account.
 * @param params.validatorAppID Validator APP ID
 * @returns List of excess amounts
 */
export declare function getAccountExcess({ client, accountAddr, validatorAppID }: {
    client: Algodv2;
    accountAddr: string;
    validatorAppID: number;
}): Promise<AccountExcess[]>;
/**
 * Checks if an account is opted into an app.
 *
 * @param params.appID The ID of the App.
 * @param params.accountAppsLocalState Array of app local states for an account.
 * @returns True if and only if the indicated account has opted into the App.
 */
export declare function isAccountOptedIntoApp({ appID, accountAppsLocalState }: {
    appID: number;
    accountAppsLocalState: AccountInformation["apps-local-state"];
}): boolean;
/**
 * @returns the minimum balance required to opt in to an app or asset (decided by `type`)
 */
export declare function getMinRequiredBalanceToOptIn(params: ({
    type: "app-opt-in";
    contractVersion: ContractVersionValue;
} | {
    type: "asset-opt-in";
}) & {
    currentMinumumBalanceForAccount: number;
    suggestedTransactionFee?: number;
}): number;
