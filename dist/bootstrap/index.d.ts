import { calculateBootstrapFundingTxnAmount, execute, generateTxns, signTxns } from "./utils";
export declare const Bootstrap: {
    v1_1: {
        generateTxns: ({ client, network, asset_1, asset_2, initiatorAddr }: {
            client: import("algosdk").Algodv2;
            network: import("..").SupportedNetwork;
            asset_1: Pick<import("..").TinymanAnalyticsApiAsset, "id" | "unit_name">;
            asset_2: Pick<import("..").TinymanAnalyticsApiAsset, "id" | "unit_name">;
            initiatorAddr: string;
        }) => Promise<import("..").SignerTransaction[]>;
        signTxns: ({ txGroup, network, initiatorSigner, asset1ID, asset2ID }: {
            txGroup: import("..").SignerTransaction[];
            network: import("..").SupportedNetwork;
            initiatorSigner: import("..").InitiatorSigner;
            asset1ID: number;
            asset2ID: number;
        }) => Promise<{
            signedTxns: Uint8Array[];
            txnIDs: string[];
        }>;
        execute: ({ client, network, pool: { asset1ID, asset2ID }, signedTxns, txnIDs }: {
            client: import("algosdk").Algodv2;
            network: import("..").SupportedNetwork;
            pool: {
                asset1ID: number;
                asset2ID: number;
            };
            signedTxns: Uint8Array[];
            txnIDs: string[];
        }) => Promise<import("..").V1PoolInfo>;
        getBootstrapFundingTxnAmount: (isAlgoPool: boolean) => 960000 | 859000;
    };
    v2: {
        generateTxns: ({ client, network, asset_1, asset_2, initiatorAddr }: {
            client: import("algosdk").Algodv2;
            network: import("..").SupportedNetwork;
            asset_1: Pick<import("..").TinymanAnalyticsApiAsset, "id" | "unit_name">;
            asset_2: Pick<import("..").TinymanAnalyticsApiAsset, "id" | "unit_name">;
            initiatorAddr: string;
        }) => Promise<import("..").SignerTransaction[]>;
        signTxns: ({ txGroup, network, initiatorSigner, asset1ID, asset2ID }: {
            txGroup: import("..").SignerTransaction[];
            network: import("..").SupportedNetwork;
            initiatorSigner: import("..").InitiatorSigner;
            asset1ID: number;
            asset2ID: number;
        }) => Promise<{
            signedTxns: Uint8Array[];
            txnIDs: string[];
        }>;
        execute: ({ client, network, pool: { asset1ID, asset2ID }, txGroup, signedTxns }: {
            client: import("algosdk").Algodv2;
            network: import("..").SupportedNetwork;
            pool: {
                asset1ID: number;
                asset2ID: number;
            };
            txGroup: import("..").SignerTransaction[];
            signedTxns: Uint8Array[];
        }) => Promise<import("..").V2PoolInfo>;
        getBootstrapFundingTxnAmount: (isAlgoPool: boolean) => number;
        getTotalCost: (isAlgoPool: boolean) => number;
    };
    generateTxns: typeof generateTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
    calculateBootstrapFundingTxnAmount: typeof calculateBootstrapFundingTxnAmount;
};
