import { Algodv2 } from "algosdk";
import { InitiatorSigner, SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { SwapQuote, V2SwapExecution } from "../types";
import { SwapType } from "../constants";
import { AssetWithIdAndAmount } from "../../util/asset/assetModels";
declare function generateTxns({ client, pool, swapType, assetIn, assetOut, initiatorAddr, slippage }: {
    client: Algodv2;
    pool: V2PoolInfo;
    swapType: SwapType;
    assetIn: AssetWithIdAndAmount;
    assetOut: AssetWithIdAndAmount;
    initiatorAddr: string;
    slippage: number;
}): Promise<SignerTransaction[]>;
declare function signTxns({ txGroup, initiatorSigner }: {
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
/**
 * Executes a swap with the desired quantities.
 */
declare function execute({ client, pool, txGroup, signedTxns, network, assetIn }: {
    client: Algodv2;
    pool: V2PoolInfo;
    network: SupportedNetwork;
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
declare function getQuote(type: SwapType, pool: V2PoolInfo, asset: AssetWithIdAndAmount, decimals: {
    assetIn: number;
    assetOut: number;
}): SwapQuote;
/**
 * @returns A quote for a fixed input swap. Does NOT execute any transactions.
 */
declare function getFixedInputSwapQuote({ pool, assetIn, decimals }: {
    pool: V2PoolInfo;
    assetIn: AssetWithIdAndAmount;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
}): SwapQuote;
/**
 * @returns A quote for a fixed output swap. Does NOT execute any transactions.
 */
declare function getFixedOutputSwapQuote({ pool, assetOut, decimals }: {
    pool: V2PoolInfo;
    assetOut: AssetWithIdAndAmount;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
}): SwapQuote;
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
