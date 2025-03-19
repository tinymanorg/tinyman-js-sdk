import { Algodv2 } from "algosdk";
import { AssetWithIdAndDecimals } from "../../util/asset/assetModels";
import { InitiatorSigner, SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { SwapType } from "../constants";
import { DirectSwapQuote, GenerateSwapTxnsParams, SwapQuote, V2SwapExecution } from "../types";
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
 * @param assetIn - Asset to be swapped
 * @param assetOut - Asset to be received
 * @param amount - Amount of asset to be swapped
 * @param network - Network to be used
 * @returns A promise for the Swap quote
 */
declare function getQuote({ type, amount, assetIn, assetOut, network, slippage, pool }: {
    type: SwapType;
    amount: bigint;
    assetIn: AssetWithIdAndDecimals;
    assetOut: AssetWithIdAndDecimals;
    pool: V2PoolInfo | null;
    network: SupportedNetwork;
    slippage: number;
}): Promise<SwapQuote>;
declare function getFixedInputDirectSwapQuote({ amount, assetIn, assetOut, pool }: {
    pool: V2PoolInfo;
    amount: bigint;
    assetIn: AssetWithIdAndDecimals;
    assetOut: AssetWithIdAndDecimals;
}): DirectSwapQuote;
declare function getFixedOutputDirectSwapQuote({ amount, assetIn, assetOut, pool }: {
    pool: V2PoolInfo | null;
    amount: bigint;
    assetIn: AssetWithIdAndDecimals;
    assetOut: AssetWithIdAndDecimals;
}): SwapQuote;
/**
 * @returns A quote for a fixed input swap. Does NOT execute any transactions.
 */
declare function getFixedInputSwapQuote({ amount, assetIn, assetOut, network, slippage, pool }: {
    amount: bigint;
    assetIn: AssetWithIdAndDecimals;
    assetOut: AssetWithIdAndDecimals;
    network: SupportedNetwork;
    pool: V2PoolInfo | null;
    slippage: number;
}): Promise<SwapQuote>;
/**
 * @returns A quote for a fixed output swap. Does NOT execute any transactions.
 */
declare function getFixedOutputSwapQuote({ amount, assetIn, assetOut, network, slippage, pool }: {
    amount: bigint;
    assetIn: AssetWithIdAndDecimals;
    assetOut: AssetWithIdAndDecimals;
    pool: V2PoolInfo | null;
    network: SupportedNetwork;
    slippage: number;
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
