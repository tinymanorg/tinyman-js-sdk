import {Algodv2} from "algosdk";

import {SignerTransaction, SupportedNetwork} from "./common-types";
import {AccountInformation} from "./account/accountTypes";
import TinymanError from "./error/TinymanError";

export function decodeState(
  stateArray: AccountInformation["apps-local-state"][0]["key-value"] = []
): Record<string, number | string> {
  const state: Record<string, number | string> = {};

  for (const pair of stateArray) {
    const {key} = pair;
    let value;

    // intentionally using == to match BigInts
    // eslint-disable-next-line eqeqeq
    if (pair.value.type == 1) {
      // value is byte array
      value = pair.value.bytes;
      // eslint-disable-next-line eqeqeq
    } else if (pair.value.type == 2) {
      // value is uint64
      value = pair.value.uint;
    } else {
      throw new Error(`Unexpected state type: ${pair.value.type}`);
    }

    state[key] = value;
  }

  return state;
}

export function joinUint8Arrays(arrays: Uint8Array[]) {
  const joined: number[] = [];

  for (const array of arrays) {
    joined.push(...array);
  }

  return Uint8Array.from(joined);
}

const MIN_BALANCE_PER_ACCOUNT = 100000n;
const MIN_BALANCE_PER_ASSET = 100000n;
const MIN_BALANCE_PER_APP = 100000n;
const MIN_BALANCE_PER_APP_BYTESLICE = 25000n + 25000n;
const MIN_BALANCE_PER_APP_UINT = 25000n + 3500n;

export function getMinBalanceForAccount(accountInfo: any): bigint {
  const totalSchema = accountInfo["apps-total-schema"];
  let totalByteSlices = 0n;
  let totalUints = 0n;

  if (totalSchema) {
    if (totalSchema["num-byte-slice"]) {
      totalByteSlices = totalSchema["num-byte-slice"];
    }
    if (totalSchema["num-uint"]) {
      totalUints = totalSchema["num-uint"];
    }
  }

  const localApps = accountInfo["apps-local-state"] || [];
  const createdApps = accountInfo["created-apps"] || [];
  const assets = accountInfo.assets || [];

  return (
    MIN_BALANCE_PER_ACCOUNT +
    MIN_BALANCE_PER_ASSET * BigInt(assets.length) +
    MIN_BALANCE_PER_APP * BigInt(createdApps.length + localApps.length) +
    MIN_BALANCE_PER_APP_UINT * totalUints +
    MIN_BALANCE_PER_APP_BYTESLICE * totalByteSlices
  );
}

export async function waitForTransaction(client: any, txId: string): Promise<any> {
  let lastStatus = await client.status().do();
  let lastRound = lastStatus["last-round"];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const status = await client.pendingTransactionInformation(txId).do();

    if (status["pool-error"]) {
      throw new Error(`Transaction Pool Error: ${status["pool-error"]}`);
    }
    if (status["confirmed-round"]) {
      return status;
    }
    lastStatus = await client.statusAfterBlock(lastRound + 1).do();
    lastRound = lastStatus["last-round"];
  }
}

export function applySlippageToAmount(
  type: "positive" | "negative",
  slippage: number,
  amount: number | bigint
): bigint {
  if (slippage > 1 || slippage < 0) {
    throw new Error(`Invalid slippage value. Must be between 0 and 1, got ${slippage}`);
  }

  let final: bigint;

  try {
    const offset = type === "negative" ? 1 - slippage : 1 + slippage;

    final = BigInt(Math.floor(Number(amount) * offset));
  } catch (error) {
    throw new Error(error.message);
  }

  return final;
}

export const ASSET_OPT_IN_PROCESS_TXN_COUNT = 1;

export function bufferToBase64(
  arrayBuffer: undefined | null | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
) {
  return arrayBuffer ? Buffer.from(arrayBuffer).toString("base64") : "";
}

/**
 * Computes quantity * 10^(-assetDecimals) and rounds the result
 */
export function convertFromBaseUnits(
  assetDecimals: number | bigint,
  quantity: number | bigint
) {
  const decimals = Number(assetDecimals);

  return roundNumber(
    {decimalPlaces: decimals},
    // eslint-disable-next-line no-magic-numbers
    Math.pow(10, -decimals) * Number(quantity)
  );
}

/**
 * Computs quantity * 10^(assetDecimals) and rounds the result
 */
export function convertToBaseUnits(
  assetDecimals: number | bigint,
  quantity: number | bigint
) {
  // eslint-disable-next-line no-magic-numbers
  const baseAmount = Math.pow(10, Number(assetDecimals)) * Number(quantity);

  // make sure the final value is an integer. This prevents this kind of computation errors: 0.0012 * 100000 = 119.99999999999999 and rounds this result into 120
  return roundNumber({decimalPlaces: 0}, baseAmount);
}

/**
 * Rounds a number up to the provided decimal places limit
 * @param {Object} options -
 * @param {number} x -
 * @returns {number} Rounded number
 */
export function roundNumber({decimalPlaces = 0}, x: number): number {
  // eslint-disable-next-line prefer-template
  return Number(Math.round(Number(x + `e+${decimalPlaces}`)) + `e-${decimalPlaces}`);
}

/**
 * @param client - An Algodv2 client.
 * @param signedTxns - Signed txns to send
 * @param txnFees - Total transaction fees
 * @param groupID - Txn Group's ID
 * @returns Confirmed round and txnID
 */
export async function sendAndWaitRawTransaction(
  client: Algodv2,
  signedTxnGroups: Uint8Array[][]
) {
  try {
    let networkResponse: {
      confirmedRound: number;
      txnID: string;
    }[] = [];

    for (let signedTxnGroup of signedTxnGroups) {
      const {txId} = await client.sendRawTransaction(signedTxnGroup).do();

      const status = await waitForTransaction(client, txId);
      const confirmedRound = status["confirmed-round"];

      networkResponse.push({
        confirmedRound,
        txnID: txId
      });
    }

    return networkResponse;
  } catch (error) {
    throw new TinymanError(
      error,
      "We encountered an error while processing this transaction. Try again later."
    );
  }
}

export function sumUpTxnFees(txns: SignerTransaction[]): number {
  return txns.reduce((totalFee, txDetail) => totalFee + txDetail.txn.fee, 0);
}

export function getTxnGroupID(txns: SignerTransaction[]) {
  return bufferToBase64(txns[0].txn.group);
}

export function generateIndexerAssetInformationEndpointURL(
  baseURL: string,
  assetId: string | number
) {
  return `${baseURL}/assets/${assetId}?include-all=true`;
}
