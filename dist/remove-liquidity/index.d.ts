export declare const RemoveLiquidity: {
    v1_1: {
        generateTxns: ({ client, pool, liquidityIn, asset1Out, asset2Out, slippage, initiatorAddr }: {
            client: import("algosdk").Algodv2;
            pool: import("../util/pool/poolTypes").V1PoolInfo;
            liquidityIn: number | bigint;
            asset1Out: number | bigint;
            asset2Out: number | bigint;
            slippage: number;
            initiatorAddr: string;
        }) => Promise<import("..").SignerTransaction[]>;
        signTxns: ({ pool, txGroup, initiatorSigner }: {
            pool: import("../util/pool/poolTypes").V1PoolInfo;
            txGroup: import("..").SignerTransaction[];
            initiatorSigner: import("..").InitiatorSigner;
        }) => Promise<Uint8Array[]>;
        execute: ({ client, pool, txGroup, signedTxns, initiatorAddr }: {
            client: import("algosdk").Algodv2;
            pool: import("../util/pool/poolTypes").V1PoolInfo;
            txGroup: import("..").SignerTransaction[];
            signedTxns: Uint8Array[];
            initiatorAddr: string;
        }) => Promise<import("..").V1_1RemoveLiquidityExecution>;
    };
    v2: {
        getQuote: ({ pool, reserves, poolTokenIn }: {
            pool: import("../util/pool/poolTypes").V2PoolInfo;
            reserves: import("..").PoolReserves;
            poolTokenIn: number | bigint;
        }) => import("..").V2RemoveLiquidityQuote;
        getSingleAssetRemoveLiquidityQuote: ({ pool, reserves, poolTokenIn, assetOutID, decimals }: {
            pool: import("../util/pool/poolTypes").V2PoolInfo;
            reserves: import("..").PoolReserves;
            poolTokenIn: number | bigint;
            assetOutID: number;
            decimals: {
                assetIn: number;
                assetOut: number;
            };
        }) => import("..").V2SingleAssetRemoveLiquidityQuote;
        getAmountWithSlippage: (amount: bigint, slippage: number) => bigint;
        generateTxns: ({ client, pool, poolTokenIn, initiatorAddr, minAsset1Amount, minAsset2Amount, slippage }: {
            client: import("algosdk").Algodv2;
            pool: import("../util/pool/poolTypes").V2PoolInfo;
            poolTokenIn: number | bigint;
            initiatorAddr: string;
            minAsset1Amount: number | bigint;
            minAsset2Amount: number | bigint;
            slippage: number;
        }) => Promise<import("..").SignerTransaction[]>;
        generateSingleAssetOutTxns: ({ client, pool, initiatorAddr, poolTokenIn, outputAssetId, minOutputAssetAmount, slippage }: {
            client: import("algosdk").Algodv2;
            pool: import("../util/pool/poolTypes").V2PoolInfo;
            outputAssetId: number;
            poolTokenIn: number | bigint;
            initiatorAddr: string;
            minOutputAssetAmount: number | bigint;
            slippage: number;
        }) => Promise<import("..").SignerTransaction[]>;
        signTxns: ({ txGroup, initiatorSigner }: {
            txGroup: import("..").SignerTransaction[];
            initiatorSigner: import("..").InitiatorSigner;
        }) => Promise<Uint8Array[]>;
        execute: ({ client, txGroup, signedTxns }: {
            client: import("algosdk").Algodv2;
            txGroup: import("..").SignerTransaction[];
            signedTxns: Uint8Array[];
        }) => Promise<{
            appCallTxnResult: Record<string, any>;
            outputAssets: any;
            groupId: string;
        }>;
    };
};
