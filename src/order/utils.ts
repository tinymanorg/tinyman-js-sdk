import {Algodv2} from "algosdk";

import {StructDefinition} from "../util/client/base/types";
import {Struct} from "../util/client/base/utils";
import {PoolReserves} from "../util/pool/poolTypes";
import {intToBytes} from "../util/util";

function getStruct(name: string, structReference: Record<string, StructDefinition>) {
  return new Struct(name, structReference);
}

async function compileTeal(sourceCode: string, algod: Algodv2): Promise<Uint8Array> {
  const compiled = await algod.compile(sourceCode).do();

  return new Uint8Array(Buffer.from(compiled.result, "base64"));
}

// Fetch and compile the approval and clear programs
async function getCompiledPrograms(algod: Algodv2) {
  // TODO: Fetch the source code from github once they are public
  const approvalSourceResponse = await fetch(
    `${process.env.PUBLIC_URL}/contracts/order_approval.teal`
  );
  const clearSourceResponse = await fetch(
    `${process.env.PUBLIC_URL}/contracts/order_clear_state.teal`
  );

  const approvalSource = await approvalSourceResponse.text();
  const clearSource = await clearSourceResponse.text();

  const approvalProgram = await compileTeal(approvalSource, algod);
  const clearProgram = await compileTeal(clearSource, algod);

  return {approvalProgram, clearProgram};
}

// TODO: Remove this once this folder is moved to js-sdk
function joinByteArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, value) => sum + value.length, 0);
  const result = new Uint8Array(totalLength);
  // for each array - copy it over result
  // next array is copied right after the previous one
  let length = 0;

  for (const array of arrays) {
    result.set(array, length);
    length += array.length;
  }

  return result;
}

function createPaddedByteArray(
  elements: number[],
  length = 8,
  paddingValue = 0,
  byteSize = 8
) {
  /* eslint-enable no-magic-numbers */
  const array = new Array(length).fill(paddingValue);

  array.splice(0, elements.length, ...elements);

  return joinByteArrays(...array.map((num) => intToBytes(num, byteSize)));
}

// TODO: Remove this util function and use it from js-sdk
const MIN_BALANCE_PER_ACCOUNT = 100000n;
const MIN_BALANCE_PER_ASSET = 100000n;
const MIN_BALANCE_PER_APP = 100000n;
const MIN_BALANCE_PER_APP_BYTESLICE = 50000n;
const MIN_BALANCE_PER_APP_UINT = 28500n;

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

// TODO: Remove this util function and use it from js-sdk after updating the function
/**
 * Calculates the pair ratio for the pool reserves
 */
function getPoolPairRatio(
  reserves: null | Pick<PoolReserves, "asset1" | "asset2">
): null | number {
  const isEmpty = isPoolEmpty(reserves);
  let pairRatio: null | number = null;

  if (reserves && !isEmpty && reserves.asset1 && reserves.asset2) {
    pairRatio = Number(reserves.asset1) / Number(reserves.asset2);
  }

  return pairRatio;
}

// TODO: Remove this util function and use it from js-sdk after updating the function
/**
 * Checks if the pool is empty
 *
 * @param poolReserves - Pool reserves
 * @returns true if pool is empty, otherwise returns false
 */
function isPoolEmpty(
  poolReserves: undefined | null | Pick<PoolReserves, "asset1" | "asset2">
): boolean {
  return Boolean(poolReserves && !(poolReserves.asset1 + poolReserves.asset2));
}

async function computeSHA512(fileArrayBuffer: Uint8Array) {
  const hashBuffer = await crypto.subtle.digest("SHA-512", fileArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Extract the first 32 bytes (256 bits)
  // eslint-disable-next-line no-magic-numbers
  const sha512_256HashArray = hashArray.slice(0, 32);

  // Convert the byte array to a hexadecimal string
  const hashHex = Array.from(sha512_256HashArray)
    // eslint-disable-next-line no-magic-numbers
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

export {
  compileTeal,
  computeSHA512,
  createPaddedByteArray,
  getCompiledPrograms,
  getPoolPairRatio,
  getStruct,
  joinByteArrays
};

/* eslint-enable no-magic-numbers */
