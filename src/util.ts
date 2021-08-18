import algosdk, {Algodv2, Transaction} from "algosdk";
import {AssetParams} from "algosdk/dist/types/src/client/v2/algod/models/types";

import {TinymanAnalyticsApiAsset, InitiatorSigner} from "./common-types";
import {AccountInformation} from "./account/accountTypes";
import {ALGO_ASSET, ALGO_ASSET_ID} from "./constant";

const CACHED_ASSETS: Map<string, TinymanAnalyticsApiAsset> = new Map();

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

export async function optIntoAsset({
  client,
  assetID,
  initiatorAddr,
  initiatorSigner
}: {
  client: Algodv2;
  assetID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}) {
  const optInTxns = await generateOptIntoAssetTxns({
    client,
    assetID,
    initiatorAddr
  });

  const signedTxns = await initiatorSigner(optInTxns);

  return sendAndWaitRawTransaction(client, signedTxns);
}

export const ASSET_OPT_IN_PROCESS_TOTAL_FEE = 1000;

export async function generateOptIntoAssetTxns({client, assetID, initiatorAddr}) {
  const suggestedParams = await client.getTransactionParams().do();

  const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: initiatorAddr,
    assetIndex: assetID,
    amount: 0,
    suggestedParams
  });

  return [optInTxn];
}

export function bufferToBase64(
  arrayBuffer: undefined | null | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
) {
  return arrayBuffer ? Buffer.from(arrayBuffer).toString("base64") : "";
}

/**
 * Fetches asset data and caches it in a Map.
 * @param algodClient - Algodv2 client
 * @param {number} id - id of the asset
 * @param {boolean} alwaysFetch - Determines whether to always fetch the information of the asset or read it from the cache
 * @returns a promise that resolves with TinymanAnalyticsApiAsset
 */
export function getAssetInformationById(
  algodClient: algosdk.Algodv2,
  id: number,
  alwaysFetch?: boolean
) {
  return new Promise<TinymanAnalyticsApiAsset>(async (resolve, reject) => {
    try {
      if (id === ALGO_ASSET_ID) {
        resolve(ALGO_ASSET);
        return;
      }

      const memoizedValue = CACHED_ASSETS.get(`${id}`);

      if (memoizedValue && !alwaysFetch) {
        resolve(memoizedValue);
        return;
      }

      const algodAsset = (await algodClient.getAssetByID(id).do()) as {
        index: number;
        params: AssetParams;
      };
      const assetData = {
        id: `${algodAsset.index}`,
        decimals: Number(algodAsset.params.decimals),
        is_liquidity_token: false,
        name: algodAsset.params.name || "",
        unit_name: algodAsset.params["unit-name"] || "",
        url: ""
      };

      CACHED_ASSETS.set(`${id}`, assetData);
      resolve(assetData);
    } catch (error) {
      reject(new Error(error.message || "Failed to fetch asset information"));
    }
  });
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
function roundNumber({decimalPlaces = 0}, x: number): number {
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
export async function sendAndWaitRawTransaction(client: Algodv2, signedTxns: any[]) {
  const {txId} = await client.sendRawTransaction(signedTxns).do();

  const status = await waitForTransaction(client, txId);
  const confirmedRound = status["confirmed-round"];

  return {
    confirmedRound,
    txnID: txId
  };
}

export function sumUpTxnFees(txns: Transaction[]): number {
  return txns.reduce((totalFee, txn) => totalFee + txn.fee, 0);
}

export function getTxnGroupID(txns: Transaction[]) {
  return bufferToBase64(txns[0].group);
}
