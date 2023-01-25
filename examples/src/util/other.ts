import { algodClient } from "./client";

/**
 * Throws and error if account has no balance
 */
export async function assertAccountHasBalance(address: string) {
  const accountInfo = await algodClient.accountInformation(address).do();
  if (!accountInfo["amount"]) {
    throw new Error(
      `Go to https://bank.testnet.algorand.network/?account=${address} and fund your account.`
    );
  }
}
