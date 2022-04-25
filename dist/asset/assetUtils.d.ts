import {SignerTransaction} from "../util/commonTypes";
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
export declare function isNFT(asset: TinymanAnalyticsApiAsset): boolean;
