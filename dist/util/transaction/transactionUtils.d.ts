import { Algodv2, Transaction } from "algosdk";
import { AssetWithIdAndAmount } from "../asset/assetModels";
import { SignerTransaction, TxnResponseInnerTxns } from "../commonTypes";
export declare function getAppCallTxnResponse(client: Algodv2, txGroup: SignerTransaction[]): Promise<Record<string, any> | undefined>;
/**
 * Tries to find the app call transaction in the group, get the response, and extract the inner txns data.
 * @returns the innter transactions of the app call transaction or `undefined` if no app call transaction was found.
 */
export declare function getAppCallInnerTxns(client: Algodv2, txGroup: SignerTransaction[]): Promise<TxnResponseInnerTxns | undefined>;
/**
 * Tries to find the asset related (asset transfer / payment (i.e. ALGO transfer))
 * inner transactions in the app call, and return the extracted asset data.
 * Useful for getting the asset data after an "execute" operation.
 */
export declare function getAppCallInnerAssetData(client: Algodv2, txGroup: SignerTransaction[]): Promise<AssetWithIdAndAmount[] | undefined>;
/**
 * Combines the provided signer transaction groups into one signer transaction group, with a new group ID
 * @param signerTransactions - The signer transaction groups to combine
 * @returns the combined signer transaction groups, with a new assigned group ID
 */
export declare function combineAndRegroupSignerTxns(...signerTransactions: SignerTransaction[][]): SignerTransaction[];
/**
 * Extracts the account address from the provided transaction.
 * @param txn - The transaction to extract the sender address from
 * @returns the account address of the sender
 */
export declare function extractSenderAddressFromTransaction(txn: Transaction): string;
