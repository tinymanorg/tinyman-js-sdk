import { Transaction, TransactionType } from "algosdk";
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
/**
 * Type of the waitForConfirmation()["inner-txns"]
 * NOT a complete type, only the fields we need.
 */
export type TxnResponseInnerTxns = {
    txn: {
        txn: {
            type: TransactionType.axfer;
            xaid: number;
            aamt: number;
            arcv: Uint8Array;
        } | {
            type: TransactionType.pay;
            amt: number;
            rcv: Uint8Array;
        } | {
            /**
             * This is not a real txn type, only added to
             * demonstrate that there can be other types
             */
            type: "other";
        };
    };
}[];
