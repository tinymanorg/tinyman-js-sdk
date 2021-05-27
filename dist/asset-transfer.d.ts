import {Algodv2} from "algosdk";
export declare function optIntoAssetIfNecessary({
  client,
  assetID,
  initiatorAddr,
  initiatorSigner
}: {
  client: Algodv2;
  assetID: number;
  initiatorAddr: string;
  initiatorSigner: (txns: any[], index: number) => Promise<Uint8Array>;
}): Promise<void>;
