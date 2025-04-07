import { execute, generateTxns, getQuote, signTxns } from "./utils";
export declare const Swap: {
    v1_1: {
        getQuote: (type: import("./constants").SwapType, pool: import("..").V1PoolInfo, reserves: import("..").PoolReserves, asset: import("..").AssetWithIdAndAmount, decimals: {
            assetIn: number;
            assetOut: number;
        }) => import("./types").SwapQuote;
        getFixedInputSwapQuote: ({ pool, reserves, assetIn, decimals }: {
            pool: import("..").V1PoolInfo;
            reserves: import("..").PoolReserves;
            assetIn: import("..").AssetWithIdAndAmount;
            decimals: {
                assetIn: number;
                assetOut: number;
            };
        }) => import("./types").SwapQuote;
        getFixedOutputSwapQuote: ({ pool, reserves, assetOut, decimals }: {
            pool: import("..").V1PoolInfo;
            reserves: import("..").PoolReserves;
            assetOut: import("..").AssetWithIdAndAmount;
            decimals: {
                assetIn: number;
                assetOut: number;
            };
        }) => import("./types").SwapQuote;
        generateTxns: ({ client, quoteAndPool, swapType, slippage, initiatorAddr }: import("./types").GenerateV1_1SwapTxnsParams) => Promise<import("..").SignerTransaction[]>;
        signTxns: ({ pool, txGroup, initiatorSigner }: {
            pool: import("..").V1PoolInfo;
            txGroup: import("..").SignerTransaction[];
            initiatorSigner: import("..").InitiatorSigner;
        }) => Promise<Uint8Array[]>;
        execute: ({ client, pool, swapType, txGroup, signedTxns, initiatorAddr }: {
            client: import("algosdk").Algodv2;
            pool: import("..").V1PoolInfo;
            swapType: import("./constants").SwapType;
            txGroup: import("..").SignerTransaction[];
            signedTxns: Uint8Array[];
            initiatorAddr: string;
        }) => Promise<import("./types").V1SwapExecution>;
        executeFixedOutputSwap: ({ client, pool, signedTxns, assetIn, assetOut, initiatorAddr }: {
            client: import("algosdk").Algodv2;
            pool: import("..").V1PoolInfo;
            signedTxns: Uint8Array[];
            assetIn: import("..").AssetWithIdAndAmount;
            assetOut: import("..").AssetWithIdAndAmount;
            initiatorAddr: string;
        }) => Promise<Omit<import("./types").V1SwapExecution, "fees" | "groupID">>;
    };
    v2: {
        getQuote: ({ type, amount, assetIn, assetOut, network, slippage, pool }: {
            type: import("./constants").SwapType;
            amount: bigint;
            assetIn: import("../util/asset/assetModels").AssetWithIdAndDecimals;
            assetOut: import("../util/asset/assetModels").AssetWithIdAndDecimals;
            pool: import("..").V2PoolInfo | null;
            network: import("..").SupportedNetwork;
            slippage: number;
        }) => Promise<import("./types").SwapQuote>;
        getFixedInputSwapQuote: ({ amount, assetIn, assetOut, network, slippage, pool }: {
            amount: bigint;
            assetIn: import("../util/asset/assetModels").AssetWithIdAndDecimals;
            assetOut: import("../util/asset/assetModels").AssetWithIdAndDecimals;
            network: import("..").SupportedNetwork;
            pool: import("..").V2PoolInfo | null;
            slippage: number;
        }) => Promise<import("./types").SwapQuote>;
        getFixedInputDirectSwapQuote: ({ amount, assetIn, assetOut, pool }: {
            pool: import("..").V2PoolInfo;
            amount: bigint;
            assetIn: import("../util/asset/assetModels").AssetWithIdAndDecimals;
            assetOut: import("../util/asset/assetModels").AssetWithIdAndDecimals;
        }) => import("./types").DirectSwapQuote;
        getFixedOutputDirectSwapQuote: ({ amount, assetIn, assetOut, pool }: {
            pool: import("..").V2PoolInfo | null;
            amount: bigint;
            assetIn: import("../util/asset/assetModels").AssetWithIdAndDecimals;
            assetOut: import("../util/asset/assetModels").AssetWithIdAndDecimals;
        }) => import("./types").SwapQuote;
        getFixedOutputSwapQuote: ({ amount, assetIn, assetOut, network, slippage, pool }: {
            amount: bigint;
            assetIn: import("../util/asset/assetModels").AssetWithIdAndDecimals;
            assetOut: import("../util/asset/assetModels").AssetWithIdAndDecimals;
            pool: import("..").V2PoolInfo | null;
            network: import("..").SupportedNetwork;
            slippage: number;
        }) => Promise<import("./types").SwapQuote>;
        generateTxns: (params: import("./types").GenerateSwapTxnsParams) => Promise<import("..").SignerTransaction[]>;
        signTxns: ({ txGroup, initiatorSigner }: {
            txGroup: import("..").SignerTransaction[];
            initiatorSigner: import("..").InitiatorSigner;
        }) => Promise<Uint8Array[]>;
        execute: ({ client, quote, txGroup, signedTxns }: {
            client: import("algosdk").Algodv2;
            quote: import("./types").SwapQuote;
            txGroup: import("..").SignerTransaction[];
            signedTxns: Uint8Array[];
        }) => Promise<import("./types").V2SwapExecution>;
        calculateFixedInputSwap: ({ inputSupply, outputSupply, swapInputAmount, totalFeeShare, decimals }: {
            inputSupply: bigint;
            outputSupply: bigint;
            swapInputAmount: bigint;
            totalFeeShare: bigint;
            decimals: {
                assetIn: number;
                assetOut: number;
            };
        }) => {
            swapOutputAmount: bigint;
            totalFeeAmount: bigint;
            priceImpact: number;
        };
    };
    getQuote: typeof getQuote;
    generateTxns: typeof generateTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
};
