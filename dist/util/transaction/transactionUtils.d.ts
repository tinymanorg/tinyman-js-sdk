import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { SignerTransaction } from "../commonTypes";
/**
 * Tries to find the app call transaction in the group, get the response, and extract the inner txns data.
 * @returns the innter transactions of the app call transaction or `undefined` if no app call transaction was found.
 */
export declare function getAppCallInnerTxns(client: AlgodClient, txGroup: SignerTransaction[]): Promise<{
    txn: {
        txn: {
            xaid: number;
            aamt: number;
            type: string;
        };
    };
}[] | undefined>;
