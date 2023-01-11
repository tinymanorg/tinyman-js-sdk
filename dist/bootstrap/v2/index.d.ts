import { Algodv2 } from "algosdk";
import { TinymanAnalyticsApiAsset } from "../../util/asset/assetModels";
import { SupportedNetwork, SignerTransaction, InitiatorSigner } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
declare function getTotalCost(isAlgoPool: boolean): number;
declare function generateTxns({ client, network, asset_1, asset_2, initiatorAddr }: {
    client: Algodv2;
    network: SupportedNetwork;
    asset_1: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
    asset_2: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
declare function getBootstrapFundingTxnAmount(isAlgoPool: boolean): number;
declare function signTxns({ txGroup, network, initiatorSigner, asset1ID, asset2ID }: {
    txGroup: SignerTransaction[];
    network: SupportedNetwork;
    initiatorSigner: InitiatorSigner;
    asset1ID: number;
    asset2ID: number;
}): Promise<{
    signedTxns: Uint8Array[];
    txnIDs: string[];
}>;
/**
 * Create an pool for an asset pair if it does not already exist. The initiator will provide
 * funding to create the pool and pay for the creation transaction fees.
 */
declare function execute({ client, network, pool: { asset1ID, asset2ID }, txGroup, signedTxns }: {
    client: Algodv2;
    network: SupportedNetwork;
    pool: {
        asset1ID: number;
        asset2ID: number;
    };
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
}): Promise<V2PoolInfo>;
export declare const BootstrapV2: {
    generateTxns: typeof generateTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
    getBootstrapFundingTxnAmount: typeof getBootstrapFundingTxnAmount;
    getTotalCost: typeof getTotalCost;
};
export {};
