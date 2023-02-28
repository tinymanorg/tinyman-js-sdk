import { SignerTransaction } from "@tinymanorg/tinyman-js-sdk";
import { Account } from "algosdk";

/**
 * @param account account data that will sign the transactions
 * @returns a function that will sign the transactions, can be used as `initiatorSigner`
 */
export default function signerWithSecretKey(account: Account) {
  return function (txGroups: SignerTransaction[][]): Promise<Uint8Array[]> {
    // Filter out transactions that don't need to be signed by the account
    const txnsToBeSigned = txGroups.flatMap((txGroup) =>
      txGroup.filter((item) => item.signers?.includes(account.addr))
    );
    // Sign all transactions that need to be signed by the account
    const signedTxns: Uint8Array[] = txnsToBeSigned.map(({ txn }) =>
      txn.signTxn(account.sk)
    );

    // We wrap this with a Promise since SDK's initiatorSigner expects a Promise
    return new Promise((resolve) => {
      resolve(signedTxns);
    });
  };
}
