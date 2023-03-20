import {Algodv2} from "algosdk";

import {SignerTransaction, TinymanApiErrorShape} from "./commonTypes";
import {AccountInformation} from "./account/accountTypes";
import TinymanError from "./error/TinymanError";

export function decodeState({
  stateArray = [],
  shouldDecodeKeys = false
}: {
  stateArray: AccountInformation["apps-local-state"][0]["key-value"];
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

    let finalKey = shouldDecodeKeys ? atob(key) : key;

    state[finalKey] = value;
  }

  return state;
}

export function joinByteArrays(arrays: Uint8Array[]) {
  let totalLength = arrays.reduce((sum, value) => sum + value.length, 0);

  let result = new Uint8Array(totalLength);

  // for each array - copy it over result
  // next array is copied right after the previous one
  let length = 0;

  for (let array of arrays) {
    result.set(array, length);
    length += array.length;
  }

  return result;
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
): Promise<Record<string, any>> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await delay(1000);

    let pendingTransactionInfo: Record<string, any> | null = null;

    try {
      pendingTransactionInfo = (await client
        .pendingTransactionInformation(txId)
        .do()) as Record<string, any> | null;
    } catch (error: any) {
      // Ignore errors from PendingTransactionInformation, since it may return 404 if the algod
      // instance is behind a load balancer and the request goes to a different algod than the
      // one we submitted the transaction to
    }

    if (pendingTransactionInfo) {
      if (pendingTransactionInfo["confirmed-round"]) {
        // Got the completed Transaction
        return pendingTransactionInfo;
      }

      if (pendingTransactionInfo["pool-error"]) {
        // If there was a pool error, then the transaction has been rejected
        throw new Error(`Transaction Rejected: ${pendingTransactionInfo["pool-error"]}`);
      }
    }
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
      const {txId} = await client.sendRawTransaction(signedTxnGroup).do();

      const status = await waitForConfirmation(client, txId);
      const confirmedRound = status["confirmed-round"];

      networkResponse.push({
        confirmedRound,
        txnID: txId
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
  return txns.reduce((totalFee, txDetail) => totalFee + txDetail.txn.fee, 0);
}

export function getTxnGroupID(txns: SignerTransaction[]) {
  return bufferToBase64(txns[0].txn.group);
}

export function encodeInteger(number) {
  let buf: number[] = [];

  /* eslint-disable no-bitwise */
  /* eslint-disable no-constant-condition */
  /* eslint-disable no-param-reassign */
  while (true) {
    let towrite = number & 0x7f;

    number >>= 7;

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
