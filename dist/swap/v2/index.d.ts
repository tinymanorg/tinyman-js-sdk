import { Algodv2 } from "algosdk";
import { InitiatorSigner, SignerTransaction } from "../../util/commonTypes";
import { GenerateSwapTxnsParams, GetFixedInputSwapQuoteByContractVersionParams, GetFixedOutputSwapQuoteByContractVersionParams, GetSwapQuoteWithContractVersionParams, SwapQuote, V2SwapExecution } from "../types";
import { AssetWithIdAndAmount } from "../../util/asset/assetModels";
declare function generateTxns(params: GenerateSwapTxnsParams): Promise<SignerTransaction[]>;
declare function signTxns({ txGroup, initiatorSigner }: {
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
/**
 * Executes a swap with the desired quantities.
 */
declare function execute({ client, quote, txGroup, signedTxns, assetIn }: {
    client: Algodv2;
    quote: SwapQuote;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    assetIn: AssetWithIdAndAmount;
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
declare function getQuote(params: GetSwapQuoteWithContractVersionParams): Promise<SwapQuote>;
/**
 * @returns A quote for a fixed input swap. Does NOT execute any transactions.
 */
declare function getFixedInputSwapQuote({ pool, assetIn, decimals, isSwapRouterEnabled }: GetFixedInputSwapQuoteByContractVersionParams): Promise<SwapQuote>;
/**
 * @returns A quote for a fixed output swap. Does NOT execute any transactions.
 */
declare function getFixedOutputSwapQuote({ pool, assetOut, decimals, isSwapRouterEnabled }: GetFixedOutputSwapQuoteByContractVersionParams): Promise<SwapQuote>;
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
    getFixedOutputSwapQuote: typeof getFixedOutputSwapQuote;
    generateTxns: typeof generateTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
    calculateFixedInputSwap: typeof calculateFixedInputSwap;
};
export {};
