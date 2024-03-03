import {Account} from "algosdk";
import {
  generateOptIntoAssetTxns,
  sendAndWaitRawTransaction
} from "@tinymanorg/tinyman-js-sdk";

import {algodClient} from "./client";
import signerWithSecretKey from "./initiatorSigner";

/**
 * Throws and error if account has no balance
 */
export async function assertAccountHasBalance(address: string, minAlgoAmount?: number) {
  const accountInfo = await algodClient.accountInformation(address).do();

  if (
    !accountInfo.amount ||
    (accountInfo.amount &&
      accountInfo.amount <= accountInfo["min-balance"] + (minAlgoAmount ?? 0))
  ) {
    throw new Error(
      `Go to https://bank.testnet.algorand.network/?account=${address} and fund your account.`
    );
  }
}

export async function executeAssetOptIn(account: Account, assetID: number) {
  const usdcAssetOptInTxn = await generateOptIntoAssetTxns({
    client: algodClient,
    assetID,
    initiatorAddr: account.addr
  });
  const signedTxn = await signerWithSecretKey(account)([usdcAssetOptInTxn]);

  const [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(algodClient, [
    signedTxn
  ]);

  console.log(
    `✅ Opted in to asset with ID: ${assetID} in transaction with ID: ${txnID} and confirmed in round: ${confirmedRound}`
  );
}
