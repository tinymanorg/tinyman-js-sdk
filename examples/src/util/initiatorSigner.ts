import { SignerTransaction } from "@tinymanorg/tinyman-js-sdk";

/**
 * initiatorSigner for signing txns with private keys
 * @param sk private key of signer account
 */
export default function signerWithSecretKey(sk: string | Uint8Array) {
  const privateKey = typeof sk === "string" ? Buffer.from(sk, "base64") : sk;
  return function (txGroupList: SignerTransaction[][]): Promise<Uint8Array[]> {
    const flatTxGroup = txGroupList.flat();
    const signedTxns = flatTxGroup.map((tx) => tx.txn.signTxn(privateKey));

    return new Promise((resolve) => {
      resolve(signedTxns);
    });
  };
}
