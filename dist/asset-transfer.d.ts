import {Algodv2} from "algosdk";
import {InitiatorSigner} from "./common-types";
export declare function optIntoAssetIfNecessary({
  client,
  assetID,
  initiatorAddr,
  initiatorSigner
}: {
  client: Algodv2;
  assetID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<void>;
