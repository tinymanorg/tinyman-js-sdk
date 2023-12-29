import { Algodv2 } from "algosdk";
import { SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { FolksLendingAssetInfo } from "../types";
export declare function generateTxns({ client, network, poolAddress, poolTokenId, lendingManagerId, asset1In, asset2In, initiatorAddr, shouldOptInToPoolToken }: {
    client: Algodv2;
    network: SupportedNetwork;
    poolAddress: string;
    poolTokenId: number;
    lendingManagerId: number;
    asset1In: FolksLendingAssetInfo;
    asset2In: FolksLendingAssetInfo;
    initiatorAddr: string;
    shouldOptInToPoolToken: boolean;
}): Promise<SignerTransaction[]>;
