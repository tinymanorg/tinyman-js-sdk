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
export declare type InitiatorSigner = (txGroupList: SignerTransaction[][]) => Promise<Uint8Array[]>;
export declare type SupportedNetwork = "testnet" | "mainnet";
/**
 * Type of the waitForConfirmation()["inner-txns"]
 * NOT a complete type, only the fields we need.
 */
export declare type TxnResponseInnerTxns = {
    txn: {
        txn: {
            type: TransactionType.axfer;
            xaid: number;
            aamt: number;
        } | {
            type: TransactionType.pay;
            amt: number;
        } | {
            /**
             * This is not a real txn type, only added to
             * demonstrate that there can be other types
             */
            type: "other";
        };
    };
}[];
