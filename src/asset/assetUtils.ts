import algosdk, {Indexer} from "algosdk";

import {SignerTransaction} from "../common-types";
import {IndexerAssetInformation, TinymanAnalyticsApiAsset} from "./assetModels";
import {ALGO_ASSET_ID, ALGO_ASSET, CACHED_ASSETS} from "./assetConstants";
import WebStorage from "../web-storage/WebStorage";
import {generateIndexerAssetInformationEndpointURL} from "../util";

export async function generateOptIntoAssetTxns({
  client,
  assetID,
  initiatorAddr
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: initiatorAddr,
    assetIndex: assetID,
    amount: 0,
    suggestedParams
  });

  return [{txn: optInTxn, signers: [initiatorAddr]}];
}

export interface GetAssetInformationByIdOptions {
  alwaysFetch?: boolean;
}

/**
 * Fetches asset data and caches it in a Map.
 * @param indexer algosdk.indexer
 * @param {number} id - id of the asset
 * @param {boolean} options.alwaysFetch - Determines whether to always fetch the information of the asset or read it from the cache
 * @returns a promise that resolves with TinymanAnalyticsApiAsset
 */
export function getAssetInformationById(
  indexer: Indexer,
  id: number,
  options?: GetAssetInformationByIdOptions
) {
  return new Promise<{asset: TinymanAnalyticsApiAsset; isDeleted: boolean}>(
    async (resolve, reject) => {
      try {
        if (id === ALGO_ASSET_ID) {
          resolve({asset: ALGO_ASSET, isDeleted: false});
          return;
        }

        const memoizedValue = CACHED_ASSETS[`${id}`];

        if (
          memoizedValue &&
          // invalidate cache for this asset if total_amount is not available in the cached data
          memoizedValue.asset.total_amount != null &&
          !options?.alwaysFetch
        ) {
          resolve(memoizedValue);
          return;
        }

        // @ts-ignore
        const baseURL = `${indexer.c.baseURL.origin}/v2`;
        // @ts-ignore
        const indexerToken = indexer.c.tokenHeader["X-Indexer-API-Token"];

        const response = await fetch(
          generateIndexerAssetInformationEndpointURL(baseURL, id),
          {
            headers: {
              // @ts-ignore
              ...indexer.c.defaultHeaders,
              // @ts-ignore
              ...(indexerToken ? indexer.c.tokenHeader : {})
            }
          }
        );
        const {asset} = (await response.json()) as IndexerAssetInformation;

        const assetData: TinymanAnalyticsApiAsset = {
          id: `${asset.index}`,
          decimals: Number(asset.params.decimals),
          is_liquidity_token: false,
          name: asset.params.name || "",
          unit_name: asset.params["unit-name"] || "",
          url: "",
          total_amount: String(asset.params.total)
        };

        CACHED_ASSETS[`${id}`] = {asset: assetData, isDeleted: asset.deleted};
        WebStorage.local.setItem(
          WebStorage.STORED_KEYS.TINYMAN_CACHED_ASSETS,
          CACHED_ASSETS
        );

        resolve({asset: assetData, isDeleted: asset.deleted});
      } catch (error) {
        reject(new Error(error.message || "Failed to fetch asset information"));
      }
    }
  );
}

export function isNFT(asset: TinymanAnalyticsApiAsset): boolean {
  return parseFloat(asset.total_amount) === 1;
}
