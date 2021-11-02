/// <reference types="node" />
import {Algodv2} from "algosdk";
import {SignerTransaction, SupportedNetwork} from "./common-types";
import {AccountInformation} from "./account/accountTypes";
export declare function decodeState(
  stateArray?: AccountInformation["apps-local-state"][0]["key-value"]
): Record<string, number | string>;
export declare function joinUint8Arrays(arrays: Uint8Array[]): Uint8Array;
export declare function getMinBalanceForAccount(accountInfo: any): bigint;
export declare function waitForTransaction(client: any, txId: string): Promise<any>;
export declare function applySlippageToAmount(
  type: "positive" | "negative",
  slippage: number,
  amount: number | bigint
): bigint;
export declare const ASSET_OPT_IN_PROCESS_TXN_COUNT = 1;
export declare function bufferToBase64(
  arrayBuffer: undefined | null | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
): string;
/**
 * Computes quantity * 10^(-assetDecimals) and rounds the result
 */
export declare function convertFromBaseUnits(
  assetDecimals: number | bigint,
  quantity: number | bigint
): number;
/**
 * Computs quantity * 10^(assetDecimals) and rounds the result
 */
export declare function convertToBaseUnits(
  assetDecimals: number | bigint,
  quantity: number | bigint
): number;
/**
 * Rounds a number up to the provided decimal places limit
 * @param {Object} options -
 * @param {number} x -
 * @returns {number} Rounded number
 */
export declare function roundNumber(
  {
    decimalPlaces
  }: {
    decimalPlaces?: number | undefined;
  },
  x: number
): number;
/**
 * @param client - An Algodv2 client.
 * @param signedTxns - Signed txns to send
 * @param txnFees - Total transaction fees
 * @param groupID - Txn Group's ID
 * @returns Confirmed round and txnID
 */
export declare function sendAndWaitRawTransaction(
  client: Algodv2,
  signedTxnGroups: Uint8Array[][]
): Promise<
  {
    confirmedRound: number;
    txnID: string;
  }[]
>;
export declare function sumUpTxnFees(txns: SignerTransaction[]): number;
export declare function getTxnGroupID(txns: SignerTransaction[]): string;
export declare function getIndexerBaseURLForNetwork(network: SupportedNetwork): any;
