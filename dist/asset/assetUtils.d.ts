import {Indexer} from "algosdk";
import {SignerTransaction} from "../common-types";
import {TinymanAnalyticsApiAsset} from "./assetModels";
export declare function generateOptIntoAssetTxns({
  client,
  assetID,
  initiatorAddr
}: {
  client: any;
  assetID: any;
  initiatorAddr: any;
}): Promise<SignerTransaction[]>;
export interface GetAssetInformationByIdOptions {
  alwaysFetch?: boolean;
  customRequestURL?: string;
}
/**
 * Fetches asset data and caches it in a Map.
 * @param indexer algosdk.indexer
 * @param {number} id - id of the asset
 * @param {boolean} options.alwaysFetch - Determines whether to always fetch the information of the asset or read it from the cache
 * @param {boolean} options.customRequestURL - Uses this URL with Fetch API to fetch asset information
 * @returns a promise that resolves with TinymanAnalyticsApiAsset
 */
export declare function getAssetInformationById(
  indexer: Indexer,
  id: number,
  options?: GetAssetInformationByIdOptions
): Promise<{
  asset: TinymanAnalyticsApiAsset;
  isDeleted: boolean;
}>;
export declare function isNFT(asset: TinymanAnalyticsApiAsset): boolean;
