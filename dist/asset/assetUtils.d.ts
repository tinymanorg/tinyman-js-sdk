import {SignerTransaction, SupportedNetwork} from "../common-types";
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
/**
 * Fetches asset data and caches it in a Map.
 * @param network "mainnet" | "testnet" | "hiponet".
 * @param {number} id - id of the asset
 * @param {boolean} alwaysFetch - Determines whether to always fetch the information of the asset or read it from the cache
 * @returns a promise that resolves with TinymanAnalyticsApiAsset
 */
export declare function getAssetInformationById(
  network: SupportedNetwork,
  id: number,
  alwaysFetch?: boolean
): Promise<{
  asset: TinymanAnalyticsApiAsset;
  isDeleted: boolean;
}>;
export declare function isNFT(asset: TinymanAnalyticsApiAsset): boolean;
