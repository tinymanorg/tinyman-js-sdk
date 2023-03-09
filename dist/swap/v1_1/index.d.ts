import { Algodv2 } from "algosdk";
import { InitiatorSigner, SignerTransaction } from "../../util/commonTypes";
import { PoolReserves, V1PoolInfo } from "../../util/pool/poolTypes";
import { GenerateV1_1SwapTxnsParams, SwapQuote, V1SwapExecution } from "../types";
import { SwapType } from "../constants";
import { AssetWithIdAndAmount } from "../../util/asset/assetModels";
declare function signTxns({ pool, txGroup, initiatorSigner }: {
    pool: V1PoolInfo;
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
declare function generateTxns({ client, quote, swapType, slippage, initiatorAddr }: GenerateV1_1SwapTxnsParams): Promise<SignerTransaction[]>;
/**
 *
 * @param type - Type of the swap
 * @param pool - Information for the pool.
 * @param reserves - Pool reserves.
 * @param asset.assetID - ID of the asset to be swapped
 * @param asset.amount - Amount of the asset to be swapped
 * @param decimals.assetIn - Decimals quantity for the input asset
 * @param decimals.assetOut - Decimals quantity for the output asset
 * @returns A promise for the Swap quote
 */
declare function getQuote(type: SwapType, pool: V1PoolInfo, reserves: PoolReserves, asset: AssetWithIdAndAmount, decimals: {
    assetIn: number;
    assetOut: number;
}): SwapQuote;
/**
 * Get a quote for a fixed input swap This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool Reserves.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetIn.amount The quantity of the input asset.
 */
declare function getFixedInputSwapQuote({ pool, reserves, assetIn, decimals }: {
    pool: V1PoolInfo;
    reserves: PoolReserves;
    assetIn: AssetWithIdAndAmount;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
}): SwapQuote;
/**
 * Get a quote for a fixed output swap This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool Reserves
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetOut.amount The quantity of the output asset.
 */
declare function getFixedOutputSwapQuote({ pool, reserves, assetOut, decimals }: {
    pool: V1PoolInfo;
    reserves: PoolReserves;
    assetOut: AssetWithIdAndAmount;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
}): SwapQuote;
/**
 * Execute a fixed output swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The desired quantity of the input asset.
 * @param params.assetIn.slippage The maximum acceptable slippage rate. Should be a number greater
 *   or equal to 0 and acts as a percentage of params.assetIn.amount. NOTE: the initiating account
 *   must posses at least params.assetIn.amount * (100 + params.assetIn.slippage) / 100 units of the
 *   input asset in order for this transaction to be valid.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The quantity of the output asset.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
declare function executeFixedOutputSwap({ client, pool, signedTxns, assetIn, assetOut, initiatorAddr }: {
    client: Algodv2;
    pool: V1PoolInfo;
    signedTxns: Uint8Array[];
    assetIn: AssetWithIdAndAmount;
    assetOut: AssetWithIdAndAmount;
    initiatorAddr: string;
}): Promise<Omit<V1SwapExecution, "fees" | "groupID">>;
/**
 * Execute a swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.swapType Type of the swap.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The desired quantity of the input asset.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The quantity of the output asset.
 * @param params.slippage The maximum acceptable slippage rate.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
declare function execute({ client, pool, swapType, txGroup, signedTxns, initiatorAddr }: {
    client: Algodv2;
    pool: V1PoolInfo;
    swapType: SwapType;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    initiatorAddr: string;
}): Promise<V1SwapExecution>;
export declare const SwapV1_1: {
    getQuote: typeof getQuote;
    getFixedInputSwapQuote: typeof getFixedInputSwapQuote;
    getFixedOutputSwapQuote: typeof getFixedOutputSwapQuote;
    generateTxns: typeof generateTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
    executeFixedOutputSwap: typeof executeFixedOutputSwap;
};
export {};
