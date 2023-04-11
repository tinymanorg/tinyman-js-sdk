/// <reference types="node" />
import { Algodv2 } from "algosdk";
import { SignerTransaction, TinymanApiErrorShape } from "./commonTypes";
import { AccountInformation } from "./account/accountTypes";
export declare function decodeState({ stateArray, shouldDecodeKeys }: {
    stateArray: AccountInformation["apps-local-state"][0]["key-value"];
    /**
     * If `true`, the returned object will have decoded keys instead of base64 encoded keys.
     */
    shouldDecodeKeys?: boolean;
}): Record<string, number | string>;
export declare function joinByteArrays(arrays: Uint8Array[]): Uint8Array;
export declare function getMinBalanceForAccount(accountInfo: any): bigint;
/**
 * Wait until a transaction has been confirmed or rejected by the network
 * @param client - An Algodv2 client
 * @param txid - The ID of the transaction to wait for.
 * @returns PendingTransactionInformation
 */
export declare function waitForConfirmation(client: Algodv2, txId: string): Promise<Record<string, any>>;
export declare function applySlippageToAmount(type: "positive" | "negative", slippage: number, amount: number | bigint): bigint;
export declare const ASSET_OPT_IN_PROCESS_TXN_COUNT = 1;
export declare function bufferToBase64(arrayBuffer: undefined | null | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>): string;
/**
 * Computes quantity * 10^(-assetDecimals) and rounds the result
 */
export declare function convertFromBaseUnits(assetDecimals: number | bigint, quantity: number | bigint): number;
/**
 * Computs quantity * 10^(assetDecimals) and rounds the result
 */
export declare function convertToBaseUnits(assetDecimals: number | bigint, quantity: number | bigint): number;
/**
 * Rounds a number up to the provided decimal places limit
 * @param {Object} options -
 * @param {number} x -
 * @returns {number} Rounded number
 */
export declare function roundNumber({ decimalPlaces }: {
    decimalPlaces?: number | undefined;
}, x: number): number;
/**
 * @param client - An Algodv2 client.
 * @param signedTxns - Signed txns to send
 * @param txnFees - Total transaction fees
 * @param groupID - Txn Group's ID
 * @returns Confirmed round and txnID
 */
export declare function sendAndWaitRawTransaction(client: Algodv2, signedTxnGroups: Uint8Array[][]): Promise<{
    confirmedRound: number;
    txnID: string;
}[]>;
export declare function sumUpTxnFees(txns: SignerTransaction[]): number;
export declare function getTxnGroupID(txns: SignerTransaction[]): string;
export declare function encodeInteger(number: any): number[];
/**
 * Converts a text into bytes
 */
export declare function encodeString(text: string): Uint8Array;
export declare function hasTinymanApiErrorShape(error: any): error is TinymanApiErrorShape;
