import { SignerTransaction } from "../commonTypes";
export declare function generateOptIntoAssetTxns({ client, assetID, initiatorAddr }: {
    client: any;
    assetID: any;
    initiatorAddr: any;
}): Promise<SignerTransaction[]>;
