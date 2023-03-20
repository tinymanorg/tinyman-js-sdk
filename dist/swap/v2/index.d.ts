import { Algodv2 } from "algosdk";
import { InitiatorSigner, SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { DirectSwapQuote, GenerateSwapTxnsParams, SwapQuote, V2SwapExecution } from "../types";
import { SwapType } from "../constants";
declare function generateTxns(params: GenerateSwapTxnsParams): Promise<SignerTransaction[]>;
declare function signTxns({ txGroup, initiatorSigner }: {
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
/**
 * Executes a swap with the desired quantities.
 */
declare function execute({ client, quote, txGroup, signedTxns }: {
    client: Algodv2;
    quote: SwapQuote;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
}): Promise<V2SwapExecution>;
/**
 * @param type - Type of the swap
 * @param pool - Information for the pool.
 * @param asset.assetID - ID of the asset to be swapped
 * @param asset.amount - Amount of the asset to be swapped
 * @param decimals.assetIn - Decimals quantity for the input asset
 * @param decimals.assetOut - Decimals quantity for the output asset
 * @returns A promise for the Swap quote
 */
declare function getQuote({ type, amount, assetInID, assetOutID, decimals, network, isSwapRouterEnabled, pool }: {
    type: SwapType;
    amount: number | bigint;
    assetInID: number;
    assetOutID: number;
    pool: V2PoolInfo | null;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
    network: SupportedNetwork;
    isSwapRouterEnabled?: boolean;
}): Promise<SwapQuote>;
declare function getFixedInputDirectSwapQuote({ amount, assetInID, assetOutID, decimals, pool }: {
    pool: V2PoolInfo;
    amount: number | bigint;
    assetInID: number;
    assetOutID: number;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
}): DirectSwapQuote;
declare function getFixedOutputDirectSwapQuote({ amount, assetInID, assetOutID, decimals, pool }: {
    pool: V2PoolInfo | null;
    amount: number | bigint;
    assetInID: number;
    assetOutID: number;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
}): SwapQuote;
/**
 * @returns A quote for a fixed input swap. Does NOT execute any transactions.
 */
declare function getFixedInputSwapQuote({ amount, assetInID, assetOutID, decimals, isSwapRouterEnabled, network, pool }: {
    amount: number | bigint;
    assetInID: number;
    assetOutID: number;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
    network: SupportedNetwork;
    pool: V2PoolInfo | null;
    isSwapRouterEnabled?: boolean;
}): Promise<SwapQuote>;
/**
 * @returns A quote for a fixed output swap. Does NOT execute any transactions.
 */
declare function getFixedOutputSwapQuote({ amount, assetInID, assetOutID, decimals, isSwapRouterEnabled, network, pool }: {
    amount: number | bigint;
    assetInID: number;
    assetOutID: number;
    pool: V2PoolInfo | null;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
    network: SupportedNetwork;
    isSwapRouterEnabled?: boolean;
}): Promise<SwapQuote>;
declare function calculateFixedInputSwap({ inputSupply, outputSupply, swapInputAmount, totalFeeShare, decimals }: {
    inputSupply: bigint;
    outputSupply: bigint;
    swapInputAmount: bigint;
    totalFeeShare: bigint;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
}): {
    swapOutputAmount: bigint;
    totalFeeAmount: bigint;
    priceImpact: number;
};
export declare const SwapV2: {
    getQuote: typeof getQuote;
    getFixedInputSwapQuote: typeof getFixedInputSwapQuote;
    getFixedInputDirectSwapQuote: typeof getFixedInputDirectSwapQuote;
    getFixedOutputDirectSwapQuote: typeof getFixedOutputDirectSwapQuote;
    getFixedOutputSwapQuote: typeof getFixedOutputSwapQuote;
    generateTxns: typeof generateTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
    calculateFixedInputSwap: typeof calculateFixedInputSwap;
};
export {};
