import {Algodv2} from "algosdk";
import {AccountInformation, AccountInformationData} from "./accountTypes";
export declare function getAccountInformation(
  client: Algodv2,
  address: string
): Promise<AccountInformationData>;
export declare function calculateAccountMinimumRequiredBalance(
  account: AccountInformation
): number;
export declare function hasSufficientMinimumBalance(
  accountData: AccountInformationData
): boolean;
