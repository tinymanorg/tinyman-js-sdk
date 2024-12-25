import { Transaction } from "algosdk";
export interface SignerTransaction {
    txn: Transaction;
    /**
     * Optional list of addresses that must sign the transactions.
     * Wallet skips to sign this txn if signers is empty array.
     * If undefined, wallet tries to sign it.
     */
    signers?: string[];
}
export type InitiatorSigner = (txGroupList: SignerTransaction[][]) => Promise<Uint8Array[]>;
export type SupportedNetwork = "testnet" | "mainnet";
export interface TinymanApiErrorDetailShape {
    [x: string]: undefined | any;
}
export interface TinymanApiErrorShape<Type extends string = string> {
    type: Type;
    detail: TinymanApiErrorDetailShape;
    fallback_message: string;
}
