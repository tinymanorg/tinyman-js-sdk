import { execute, generateTxns, getQuote, signTxns } from "./utils";
export declare const Swap: {
    v1_1: {
        getQuote: (type: import("./constants").SwapType, pool: import("..").V1PoolInfo, reserves: import("..").PoolReserves, asset: import("../util/asset/assetModels").AssetWithIdAndAmount, decimals: {
            assetIn: number;
            assetOut: number;
        }) => import("./types").DirectSwapQuote;
        getFixedInputSwapQuote: ({ pool, reserves, assetIn, decimals }: {
            pool: import("..").V1PoolInfo;
            reserves: import("..").PoolReserves;
            assetIn: import("../util/asset/assetModels").AssetWithIdAndAmount;
            decimals: {
                assetIn: number;
                assetOut: number;
            };
        }) => import("./types").DirectSwapQuote;
        getFixedOutputSwapQuote: ({ pool, reserves, assetOut, decimals }: {
            pool: import("..").V1PoolInfo;
            reserves: import("..").PoolReserves;
            assetOut: import("../util/asset/assetModels").AssetWithIdAndAmount;
            decimals: {
                assetIn: number;
                assetOut: number;
            };
        }) => import("./types").DirectSwapQuote;
        generateTxns: ({ client, pool, swapType, assetIn, assetOut, slippage, initiatorAddr }: import("./types").GenerateSwapTxnsWithoutRouterParams) => Promise<import("..").SignerTransaction[]>;
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
            assetIn: import("../util/asset/assetModels").AssetWithIdAndAmount;
            assetOut: import("../util/asset/assetModels").AssetWithIdAndAmount;
            initiatorAddr: string;
        }) => Promise<Omit<import("./types").V1SwapExecution, "fees" | "groupID">>;
    };
    v2: {
        getQuote: (params: import("./types").GetSwapQuoteWithContractVersionParams) => Promise<import("./types").SwapQuote>;
        getFixedInputSwapQuote: ({ pool, assetIn, decimals, isSwapRouterEnabled }: import("./types").GetFixedInputSwapQuoteByContractVersionParams) => Promise<import("./types").SwapQuote>;
        getFixedOutputSwapQuote: ({ pool, assetOut, decimals, isSwapRouterEnabled }: import("./types").GetFixedOutputSwapQuoteByContractVersionParams) => Promise<import("./types").SwapQuote>;
        generateTxns: (params: import("./types").GenerateSwapTxnsParams) => Promise<import("..").SignerTransaction[]>;
        signTxns: ({ txGroup, initiatorSigner }: {
            txGroup: import("..").SignerTransaction[];
            initiatorSigner: import("..").InitiatorSigner;
        }) => Promise<Uint8Array[]>;
        execute: ({ client, quote, txGroup, signedTxns, assetIn }: {
            client: import("algosdk").Algodv2;
            quote: import("./types").SwapQuote;
            txGroup: import("..").SignerTransaction[];
            signedTxns: Uint8Array[];
            assetIn: import("../util/asset/assetModels").AssetWithIdAndAmount;
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
