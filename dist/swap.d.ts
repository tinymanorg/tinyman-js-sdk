import { PoolInfo } from "./pool";
import { InitiatorSigner } from "./common-types";
/** An object containing information about a swap quote. */
export interface SwapQuote {
    /** The round that this quote is based on. */
    round: number;
    /** The ID of the input asset in this quote. */
    assetInID: number;
    /** The quantity of the input asset in this quote. */
    assetInAmount: bigint;
    /** The ID of the output asset in this quote. */
    assetOutID: number;
    /** The quantity of the output asset in this quote. */
    assetOutAmount: bigint;
    /** The amount of fee that may be spent (in the currency of the fixed asset) for the swap  */
    swapFee: number;
    /** The final exchange rate for this swap expressed as  assetOutAmount / assetInAmount */
    rate: number;
}
/** An object containing information about a successfully executed swap. */
export interface SwapExecution {
    /** The round that the swap occurred in. */
    round: number;
    /**
     * The total amount of transaction fees that were spent (in microAlgos) to execute the swap and,
     * if applicable, redeem transactions.
     */
    fees: number;
    /** The ID of the swap's input asset. */
    assetInID: number;
    /** The amount of the swap's input asset. */
    assetInAmount: bigint;
    /** The ID of the swap's output asset. */
    assetOutID: number;
    /** The amount of the swap's output asset. */
    assetOutAmount: bigint;
    /** The ID of the transaction. */
    txnID: string;
    excessAmount: {
        /** Asset ID for which the excess amount can be redeemed with */
        assetID: number;
        /** Excess amount for the current swap */
        excessAmountForSwap: bigint;
        /** Total excess amount accumulated for the pool asset */
        totalExcessAmount: bigint;
    };
    /** The group ID for the transaction group. */
    groupID: string;
}
/**
 * Get a quote for a fixed input swap This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetIn.amount The quantity of the input asset.
 */
export declare function getFixedInputSwapQuote({ client, pool, assetIn }: {
    client: any;
    pool: PoolInfo;
    assetIn: {
        assetID: number;
        amount: number | bigint;
    };
}): Promise<SwapQuote>;
/**
 * Execute a fixed input swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The quantity of the input asset.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The desired quantity of the output asset.
 * @param params.assetOut.slippage The maximum acceptable slippage rate. Should be a number between
 *   0 and 100 and acts as a percentage of params.assetOut.amount.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function fixedInputSwap({ client, pool, assetIn, assetOut, initiatorAddr, initiatorSigner }: {
    client: any;
    pool: PoolInfo;
    assetIn: {
        assetID: number;
        amount: number | bigint;
    };
    assetOut: {
        assetID: number;
        amount: number | bigint;
        slippage: number;
    };
    initiatorAddr: string;
    initiatorSigner: InitiatorSigner;
}): Promise<SwapExecution>;
/**
 * Get a quote for a fixed output swap This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetOut.amount The quantity of the output asset.
 */
export declare function getFixedOutputSwapQuote({ client, pool, assetOut }: {
    client: any;
    pool: PoolInfo;
    assetOut: {
        assetID: number;
        amount: number | bigint;
    };
}): Promise<SwapQuote>;
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
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function fixedOutputSwap({ client, pool, assetIn, assetOut, initiatorAddr, initiatorSigner }: {
    client: any;
    pool: PoolInfo;
    assetIn: {
        assetID: number;
        amount: number | bigint;
        slippage: number;
    };
    assetOut: {
        assetID: number;
        amount: number | bigint;
    };
    initiatorAddr: string;
    initiatorSigner: InitiatorSigner;
}): Promise<SwapExecution>;
