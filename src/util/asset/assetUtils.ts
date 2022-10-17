import algosdk from "algosdk";

import {SignerTransaction} from "../commonTypes";
import TinymanError from "../error/TinymanError";
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
 * @returns Ordered (asset with bigger id becomes asset1) asset data of the pool in frontend friendly format
 */
export function prepareAssetPairData(
  asset_1: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">,
  asset_2: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">
): {
  asset1: {id: number; unitName: string};
  asset2: {id: number; unitName: string};
} {
  const {unit_name: asset1UnitName} = asset_1;
  const asset1ID = Number(asset_1.id);
  const {unit_name: asset2UnitName} = asset_2;
  const asset2ID = Number(asset_2.id);

  // Make sure asset1 has greater ID
  const assets =
    asset1ID > asset2ID
      ? {
          asset1: {id: asset1ID, unitName: asset1UnitName},
          asset2: {id: asset2ID, unitName: asset2UnitName}
        }
      : {
          asset1: {id: asset2ID, unitName: asset2UnitName},
          asset2: {id: asset1ID, unitName: asset1UnitName}
        };

  return assets;
}
