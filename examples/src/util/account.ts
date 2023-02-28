import { Account, generateAccount } from "algosdk";
import { writeFileSync, readFileSync } from "fs";
import { getAccountInformation } from "@tinymanorg/tinyman-js-sdk";
import { algodClient } from "./client";
import { assertAccountHasBalance } from "./other";

export const ACCOUNT_FILENAME = "account.json";

/**
 * @returns existing account if exists, otherwise generates a new account
 */
export async function getAccount(): Promise<Account> {
  let account: Account | undefined = tryGetAccountFromJson();

  if (!account) {
    account = generateAccount();

    console.log("✅ Account generated: " + account.addr);
    console.log("✅ Account data saved to: " + ACCOUNT_FILENAME);

    writeFileSync(ACCOUNT_FILENAME, JSON.stringify(account));
  }

  try {
    await assertAccountHasBalance(account.addr);
  } catch (error) {
    console.log(error);
  }

  return account;
}

/** tries to read and return account data from the local json file */
function tryGetAccountFromJson() {
  try {
    const parsedAccount = JSON.parse(
      readFileSync(ACCOUNT_FILENAME).toString()
    ) as { addr: Account["addr"]; sk: Record<string, number> };
    const account: Account = {
      ...parsedAccount,
      // This is needed since byte array can't be serialized correctly
      sk: new Uint8Array(Object.values(parsedAccount.sk)),
    };

    return account;
  } catch (_e) {
    return undefined;
  }
}

/**
 * @returns the amount of the asset (with the given `assetId`) owned by the account
 */
export async function getOwnedAssetAmount(
  accountAddress: string,
  assetId: number
) {
  const { assets } = await getAccountInformation(algodClient, accountAddress);

  return assets.find((asset) => asset["asset-id"] === assetId)?.amount || 0;
}
