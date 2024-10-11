import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import {CID} from "multiformats";
/* eslint-disable import/no-unresolved */
import {base32} from "multiformats/bases/base32";
import {code} from "multiformats/codecs/raw";
import {sha256} from "multiformats/hashes/sha2";
/* eslint-enable import/no-unresolved */
import {
  Transaction,
  assignGroupID,
  decodeUnsignedTransaction,
  encodeUnsignedTransaction
} from "algosdk";

import {TWO_TO_THE_64} from "./vault/constants";
import {getSlope} from "./vault/utils";

async function getRawBoxValue(algod: AlgodClient, appId: number, boxName: Uint8Array) {
  try {
    const {value} = await algod.getApplicationBoxByName(appId, boxName).do();

    return value;
  } catch (error: any) {
    if (error.message.includes("box not found")) {
      return null;
    }

    throw error;
  }
}

async function doesBoxExist(
  algod: AlgodClient,
  appId: number,
  boxName: Uint8Array
): Promise<boolean> {
  try {
    const value = await getRawBoxValue(algod, appId, boxName);

    return Boolean(value);
  } catch (error: any) {
    return false;
  }
}

function getBias(slope: number, timeDelta: number) {
  if (timeDelta < 0) {
    throw new Error("Time delta must be greater than or equal to 0");
  }

  return Math.floor((slope * timeDelta) / TWO_TO_THE_64);
}

/**
 * Calculates the tiny power at a given timestamp
 * @param lockAmount - amount of tokens locked
 * @param lockEndTime - timestamp of the end of the lock, in seconds
 * @param timeStamp - timestamp of the time to calculate the tiny power for, in seconds
 * @returns tiny power at the given timestamp
 */
function calculateTinyPower(
  lockAmount: number,
  lockEndTime: number,
  timeStamp: number = Math.floor(Date.now() / 1000)
) {
  const slope = getSlope(lockAmount);
  const timeDelta = lockEndTime - timeStamp;

  return timeDelta < 0 ? 0 : getBias(slope, timeDelta);
}

function getCumulativePowerDelta(bias: number, slope: number, timeDelta: number) {
  let biasDelta = getBias(slope, timeDelta);

  if (biasDelta > bias) {
    if (slope) {
      biasDelta = (bias * bias * TWO_TO_THE_64) / (slope * 2);
    } else {
      biasDelta = 0;
    }
  } else {
    const newBias = bias - biasDelta;

    biasDelta = ((bias + newBias) * timeDelta) / 2;
  }

  return biasDelta;
}

async function getGlobalState(algod: AlgodClient, appId: number) {
  const applicationInfo = await algod.getApplicationByID(appId).do();

  return parseGlobalStateFromApplicationInfo(applicationInfo);
}

function parseGlobalStateFromApplicationInfo(applicationInfo: Record<string, any>) {
  const rawGlobalState = applicationInfo.params["global-state"];

  const globalState: Record<string, any> = {};

  for (const pair of rawGlobalState) {
    const key = Buffer.from(pair.key, "base64").toString();

    let value;

    if (pair.value.type === 1) {
      value = Buffer.from(pair.value.bytes || "", "base64");
    } else {
      value = pair.value.uint || 0;
    }

    globalState[key] = value;
  }

  return globalState;
}

//  Move this function to global 'utils' folder
function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function serializeMetadata(metadata: Record<string, any>) {
  return JSON.stringify(metadata, Object.keys(metadata).sort(), 0);
}

async function generateCidFromSerializedMetadata(serializedMetadata: string) {
  const bytes = new TextEncoder().encode(serializedMetadata);
  const digest = await sha256.digest(bytes);
  const cid = CID.createV1(code, digest);

  return cid.toString(base32);
}

function generateCidFromProposalMetadata(metadata: Record<string, any>) {
  return generateCidFromSerializedMetadata(serializeMetadata(metadata));
}
function combineAndRegroupTxns(...txns: Transaction[][]): Transaction[] {
  const flattenedOldTxns = txns.flat();

  // Remove the group data from the transactions
  const degroupedTxns = flattenedOldTxns.map((txn) => {
    txn.group = undefined;

    /**
     * We do first encode and then decode, to make sure it's still an instance of Transaction
     * Otherwise, algosdk will try to create a new instance of Transaction,
     * and that will cause an error ("malformed address")
     */
    return decodeUnsignedTransaction(encodeUnsignedTransaction(txn));
  });

  // Assign a new group ID to the combined transactions
  const newTxnGroup = assignGroupID(degroupedTxns);

  return newTxnGroup;
}

async function getAllBoxNames(algod: AlgodClient, appId: number) {
  const response = await algod.getApplicationBoxes(appId).do();

  return response.boxes.map((box) => box.name);
}

export {
  calculateTinyPower,
  combineAndRegroupTxns,
  concatUint8Arrays,
  doesBoxExist,
  generateCidFromProposalMetadata,
  getAllBoxNames,
  getBias,
  getCumulativePowerDelta,
  getGlobalState,
  getRawBoxValue
};
