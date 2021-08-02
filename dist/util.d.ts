/// <reference types="node" />
import algosdk, {Algodv2} from "algosdk";
import {
  AccountInformationData,
  AlgorandMobileApiAsset,
  InitiatorSigner
} from "./common-types";
export declare function decodeState(
  stateArray?: AccountInformationData["apps-local-state"][0]["key-value"]
): Record<string, number | string>;
export declare function joinUint8Arrays(arrays: Uint8Array[]): Uint8Array;
export declare function getMinBalanceForAccount(accountInfo: any): bigint;
export declare function waitForTransaction(client: any, txId: string): Promise<any>;
export declare function applySlippageToAmount(
  type: "positive" | "negative",
  slippage: number,
  amount: number | bigint
): bigint;
export declare function optIntoAsset({
  client,
  assetID,
  initiatorAddr,
  initiatorSigner
}: {
  client: Algodv2;
  assetID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<void>;
export declare function bufferToBase64(
  arrayBuffer: undefined | null | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
): string;
export declare function getAssetInformationById(
  algodClient: algosdk.Algodv2,
  id: number
): Promise<
  AlgorandMobileApiAsset & {
    creator: null | string;
  }
>;
