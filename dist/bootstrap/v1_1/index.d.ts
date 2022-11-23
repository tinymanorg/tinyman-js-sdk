import { Algodv2 } from "algosdk";
import { InitiatorSigner, SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { V1PoolInfo } from "../../util/pool/poolTypes";
import { TinymanAnalyticsApiAsset } from "../../util/asset/assetModels";
declare function generateTxns({ client, network, asset_1, asset_2, initiatorAddr }: {
    client: Algodv2;
    network: SupportedNetwork;
    asset_1: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
    asset_2: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
/**
 * To get the total Bootstrap fee, one extra transaction fee (1000) can be added
 * to the result of this function.
 * @returns the bootstrap funding txn amount
 */
declare function getBootstrapFundingTxnAmount(isAlgoPool: boolean): 960000 | 859000;
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
declare function execute({ client, network, pool: { asset1ID, asset2ID }, signedTxns, txnIDs }: {
    client: Algodv2;
    network: SupportedNetwork;
    pool: {
        asset1ID: number;
        asset2ID: number;
    };
    signedTxns: Uint8Array[];
    txnIDs: string[];
}): Promise<V1PoolInfo>;
export declare const BootstrapV1_1: {
    generateTxns: typeof generateTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
    getBootstrapFundingTxnAmount: typeof getBootstrapFundingTxnAmount;
};
export {};
