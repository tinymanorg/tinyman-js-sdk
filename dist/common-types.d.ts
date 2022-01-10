import {Transaction} from "algosdk";
export interface SignerTransaction {
  txn: Transaction;
  /**
   * Optional list of addresses that must sign the transactions.
   * Wallet skips to sign this txn if signers is empty array.
   * If undefined, wallet tries to sign it.
   */
  signers?: string[];
}
export declare type InitiatorSigner = (
  txGroupList: SignerTransaction[][]
) => Promise<Uint8Array[]>;
export declare type SupportedNetwork = "testnet" | "mainnet";
