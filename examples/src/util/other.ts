import {
  CONTRACT_VERSION,
  SupportedNetwork,
} from "@tinymanorg/tinyman-js-sdk";
import { algodClient } from "./client";

/**
 * Some arguments that are common for most SDK function calls,
 * stored here to reduce the repetition
 */
export const SDK_TEST_ARGS = {
  contractVersion: CONTRACT_VERSION.V2,
  network: "testnet" as SupportedNetwork,
  client: algodClient,
};

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
