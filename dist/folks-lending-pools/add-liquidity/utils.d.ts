import { Algodv2 } from "algosdk";
import { SupportedNetwork } from "../../util/commonTypes";
export declare function getFolksWrapperAppOptInRequiredAssetIDs({ client, network, assetIDs }: {
    client: Algodv2;
    network: SupportedNetwork;
    assetIDs: number[];
}): Promise<number[]>;
