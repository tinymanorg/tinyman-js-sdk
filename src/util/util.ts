import {Algodv2, bytesToBase64, modelsv2} from "algosdk";
import {TealKeyValue} from "algosdk/dist/types/client/v2/algod/models/types";

import {SignerTransaction, TinymanApiErrorShape} from "./commonTypes";
import TinymanError from "./error/TinymanError";

export function decodeState({
  stateArray = [],
  shouldDecodeKeys = false
}: {
  stateArray: TealKeyValue[];
  /**
   * If `true`, the returned object will have decoded keys instead of base64 encoded keys.
   */
  shouldDecodeKeys?: boolean;
}): Record<string, number | string> {
  const state: Record<string, number | string> = {};

  for (const pair of stateArray) {
    const {key} = pair;
    let value;

    // intentionally using == to match BigInts
    if (pair.value.type == 1) {
      // value is byte array
      value = pair.value.bytes;
    } else if (pair.value.type == 2) {
      // value is uint64
      value = pair.value.uint;
    } else {
      throw new Error(`Unexpected state type: ${pair.value.type}`);
    }

    let finalKey = shouldDecodeKeys ? Buffer.from(key).toString() : bytesToBase64(key);

    state[finalKey] = value;
  }

  return state;
}

export function joinByteArrays(...arrays: Uint8Array[]): Uint8Array {
  let totalLength = arrays.reduce((sum, value) => sum + value.length, 0);
  const result = new Uint8Array(totalLength);
  // for each array - copy it over result
  // next array is copied right after the previous one
  let length = 0;

  for (let array of arrays) {
    result.set(array, length);
    length += array.length;
  }

  return result;
}

function delay(timeout: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, timeout);
  });
}

/**
 * Wait until a transaction has been confirmed or rejected by the network
 * @param client - An Algodv2 client
 * @param txid - The ID of the transaction to wait for.
 * @returns PendingTransactionInformation
 */
export async function waitForConfirmation(
  client: Algodv2,
  txId: string
): Promise<modelsv2.PendingTransactionResponse> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await delay(1000);

    let pendingTransactionInfo: modelsv2.PendingTransactionResponse | null = null;

    try {
      pendingTransactionInfo = (await client
        .pendingTransactionInformation(txId)
        .do()) as modelsv2.PendingTransactionResponse | null;
    } catch (error: any) {
      // Ignore errors from PendingTransactionInformation, since it may return 404 if the algod
      // instance is behind a load balancer and the request goes to a different algod than the
      // one we submitted the transaction to
    }

    if (pendingTransactionInfo) {
      if (pendingTransactionInfo.confirmedRound) {
        // Got the completed Transaction
        return pendingTransactionInfo;
      }

      if (pendingTransactionInfo.poolError) {
        // If there was a pool error, then the transaction has been rejected
        throw new Error(`Transaction Rejected: ${pendingTransactionInfo.poolError}`);
      }
    }
  }
}

export function applySlippageToAmount(
  type: "positive" | "negative",
  slippage: number,
  amount: bigint
): bigint {
  if (slippage > 1 || slippage < 0) {
    throw new Error(`Invalid slippage value. Must be between 0 and 1, got ${slippage}`);
  }

  let final: bigint;

  try {
    const offset = type === "negative" ? 1 - slippage : 1 + slippage;

    final = BigInt(Math.floor(Number(amount) * offset));
  } catch (error: any) {
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
  const baseAmount = Math.pow(10, Number(assetDecimals)) * Number(quantity);

  // make sure the final value is an integer. This prevents this kind of computation errors: 0.0012 * 100000 = 119.99999999999999 and rounds this result into 120
  return BigInt(roundNumber({decimalPlaces: 0}, baseAmount));
}

/**
 * Rounds a number up to the provided decimal places limit
 * @param {Object} options -
 * @param {number} x -
 * @returns {number} Rounded number
 */
export function roundNumber({decimalPlaces = 0}, x: number): number {
  if (decimalPlaces > 0) {
    const [decimal, decimalExponentialPart] = getExponentialNumberComponents(x);

    const [rounded, roundedExponentialPart] = getExponentialNumberComponents(
      Math.round(
        Number(
          generateExponentialNumberFromComponents(
            decimal,
            decimalExponentialPart + decimalPlaces
          )
        )
      )
    );

    return Number(
      generateExponentialNumberFromComponents(
        rounded,
        roundedExponentialPart - decimalPlaces
      )
    );
  }

  return Math.round(x);
}

/**
 * @example
 * generateExponentialNumberFromComponents(1023, 0); // "1023e+0"
 * generateExponentialNumberFromComponents(1.023, 21); // "1.023e+21"
 * generateExponentialNumberFromComponents(1.023, -21); // "1.023e-21"
 */
function generateExponentialNumberFromComponents(decimalPart: number, exponent: number) {
  return decimalPart + (exponent < 0 ? `e${exponent}` : `e+${exponent}`);
}

/**
 * @example
 * getExponentialNumberComponents(1023);  // [1023, 0]
 * getExponentialNumberComponents(1023e+0);  // [1023, 0]
 * getExponentialNumberComponents(1.023e+21);  // [1.023, 21]
 * getExponentialNumberComponents(1.023e-21);  // [1.023, -21]
 */
function getExponentialNumberComponents(x: number): [number, number] {
  if (x.toString().includes("e")) {
    const parts = x.toString().split("e");

    return [parseFloat(parts[0]), parseFloat(parts[1])];
  }

  return [x, 0];
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
      const {txid} = await client.sendRawTransaction(signedTxnGroup).do();

      const status = await waitForConfirmation(client, txid);
      const confirmedRound = Number(status.confirmedRound);

      networkResponse.push({
        confirmedRound,
        txnID: txid
      });
    }

    return networkResponse;
  } catch (error: any) {
    throw new TinymanError(
      error,
      "We encountered an error while processing this transaction. Try again later."
    );
  }
}

export function sumUpTxnFees(txns: SignerTransaction[]): number {
  return txns.reduce((totalFee, txDetail) => totalFee + Number(txDetail.txn.fee), 0);
}

export function getTxnGroupID(txns: SignerTransaction[]) {
  return bufferToBase64(txns[0].txn.group?.buffer);
}

/* eslint-disable no-bitwise */
export function intToBytes(num: number, length = 8): Uint8Array {
  const byteArray = new Uint8Array(length);
  let newNum = BigInt(num);

  for (let i = length - 1; i >= 0; i--) {
    byteArray[i] = Number(newNum & BigInt(0xff));
    newNum >>= BigInt(8);
  }

  return byteArray;
}
/* eslint-enable no-bitwise */

export function encodeInteger(number: bigint) {
  let buf: number[] = [];

  /* eslint-disable no-bitwise */
  /* eslint-disable no-constant-condition */
  /* eslint-disable no-param-reassign */
  while (true) {
    let towrite = Number(number & BigInt(0x7f));

    number >>= BigInt(7);

    if (number) {
      buf.push(towrite | 0x80);
    } else {
      buf.push(towrite);
      break;
    }
  }
  /* eslint-enable */

  return buf;
}

/**
 * Converts a text into bytes
 */
export function encodeString(text: string) {
  return new TextEncoder().encode(text);
}

export function hasTinymanApiErrorShape(error: any): error is TinymanApiErrorShape {
  return Boolean(error) && typeof error.fallback_message !== "undefined";
}
