import {Algodv2} from "algosdk";

import {
  BASE_MINIMUM_BALANCE,
  MINIMUM_BALANCE_REQUIRED_PER_APP,
  MINIMUM_BALANCE_REQUIRED_PER_ASSET
} from "../constant";
import {AccountInformation, AccountInformationData} from "./accountTypes";

export function getAccountInformation(client: Algodv2, address: string) {
  return new Promise<AccountInformationData>(async (resolve, reject) => {
    try {
      const accountInfo = await (client
        .accountInformation(address)
        .do() as Promise<AccountInformation>);

      resolve({
        ...accountInfo,
        minimum_required_balance: calculateAccountMinimumRequiredBalance(accountInfo)
      });
    } catch (error) {
      reject(new Error(error.message || "Failed to fetch account information"));
    }
  });
}

export function calculateAccountMinimumRequiredBalance(
  account: AccountInformation
): number {
  const totalSchema = account["apps-total-schema"];

  return (
    BASE_MINIMUM_BALANCE +
    (account.assets || []).length * MINIMUM_BALANCE_REQUIRED_PER_ASSET +
    (account["apps-local-state"] || []).length * MINIMUM_BALANCE_REQUIRED_PER_APP +
    ((totalSchema && totalSchema["num-byte-slice"]) || 0) * 50000 +
    ((totalSchema && totalSchema["num-uint"]) || 0) * 28500
  );
}

export function hasSufficientMinimumBalance(accountData: AccountInformationData) {
  return accountData.amount >= accountData.minimum_required_balance;
}
