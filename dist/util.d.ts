import {Algodv2} from "algosdk";
import {InitiatorSigner} from "./common-types";
export declare function decodeState(
  stateArray: any[]
): Record<string, string | number | bigint>;
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
