import algosdk from "algosdk";

import {SignerTransaction} from "../commonTypes";
import TinymanError from "../error/TinymanError";
import {ALGO_ASSET_ID} from "./assetConstants";
import {TinymanAnalyticsApiAsset} from "./assetModels";

export async function generateOptIntoAssetTxns({
  client,
  assetID,
  initiatorAddr
}): Promise<SignerTransaction[]> {
  try {
    const suggestedParams = await client.getTransactionParams().do();

    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: initiatorAddr,
      assetIndex: assetID,
      amount: 0,
      suggestedParams
    });

    return [{txn: optInTxn, signers: [initiatorAddr]}];
  } catch (error: any) {
    throw new TinymanError(
      error,
      "We encountered something unexpected while opting into this asset. Try again later."
    );
  }
}

/**
 * @param asset_1 - Asset 1 of the pool
 * @param asset_2 - Asset 2 of the pool
 * @returns Array of assets, ordered by descending asset id
 */

export function prepareAssetPairData<Asset extends {id: string | number}>(
  asset_1: Asset,
  asset_2: Asset
): [Omit<Asset, "id"> & {id: number}, Omit<Asset, "id"> & {id: number}] {
  const asset1ID = Number(asset_1.id);
  const asset2ID = Number(asset_2.id);

  // Make sure first asset has greater ID
  return asset1ID > asset2ID
    ? [
        {...asset_1, id: asset1ID},
        {...asset_2, id: asset2ID}
      ]
    : [
        {...asset_2, id: asset2ID},
        {...asset_1, id: asset1ID}
      ];
}

/**
 * @returns Array of given asset ids, bigger first
 */
export function sortAssetIds(asset1ID: number, asset2ID: number): number[] {
  const assets = [asset1ID, asset2ID];

  return [Math.max(...assets), Math.min(...assets)];
}

/**
 * @returns `true` if the given id is the asset id of ALGO
 */
export function isAlgo(id: number | string | bigint) {
  return Number(id) === ALGO_ASSET_ID;
}
