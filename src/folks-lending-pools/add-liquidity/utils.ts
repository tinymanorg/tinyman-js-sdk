import {Algodv2, getApplicationAddress} from "algosdk";

import {SupportedNetwork} from "../../util/commonTypes";
import {FOLKS_WRAPPER_APP_ID} from "../constants";
import {ALGO_ASSET_ID} from "../../util/asset/assetConstants";

export async function getFolksWrapperAppOptInRequiredAssetIDs({
  client,
  network,
  assetIDs
}: {
  client: Algodv2;
  network: SupportedNetwork;
  assetIDs: number[];
}) {
  const wrapperAppAddress = getApplicationAddress(FOLKS_WRAPPER_APP_ID[network]);
  const appInfo = await client.accountInformation(wrapperAppAddress).do();
  const appOptedInAssetIDs = appInfo.assets
    ? appInfo.assets.map((asset) => asset.assetId)
    : [];

  return assetIDs.filter(
    (assetID: number) =>
      assetID !== ALGO_ASSET_ID && !appOptedInAssetIDs.includes(BigInt(assetID))
  );
}
