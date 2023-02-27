import { Algodv2 } from "algosdk";
import { SignerTransaction } from "../commonTypes";
export declare function generateOptIntoAssetTxns({ client, assetID, initiatorAddr }: {
    client: Algodv2;
    assetID: number;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
/**
 * @param asset_1 - Asset 1 of the pool
 * @param asset_2 - Asset 2 of the pool
 * @returns Array of assets, ordered by descending asset id
 */
export declare function prepareAssetPairData<Asset extends {
    id: string | number;
}>(asset_1: Asset, asset_2: Asset): [Omit<Asset, "id"> & {
    id: number;
}, Omit<Asset, "id"> & {
    id: number;
}];
/**
 * @returns Array of given asset ids, bigger first
 */
export declare function sortAssetIds(asset1ID: number, asset2ID: number): number[];
/**
 * @returns `true` if the given asset id is the ALGO asset id
 */
export declare function isAlgo(id: number | string): boolean;
/**
 * Returns asset.asset_id
 */
export declare function getAssetId(asset: {
    id: string | number;
}): number;
