import {Algodv2, getApplicationAddress} from "algosdk";

import {SupportedNetwork} from "../../util/commonTypes";
import {FOLKS_WRAPPER_APP_ID} from "../constants";
import {getAccountInformation} from "../../util/account/accountUtils";
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
  const accountInfo = await getAccountInformation(client, wrapperAppAddress);
  const appOptedInAssetIDs =
    accountInfo.assets?.map((asset) => Number(asset.assetId)) || [];

  return assetIDs.filter(
    (assetID: number) =>
      assetID !== ALGO_ASSET_ID && !appOptedInAssetIDs.includes(assetID)
  );
}
