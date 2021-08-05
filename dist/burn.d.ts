import { PoolInfo } from "./pool";
import { InitiatorSigner } from "./common-types";
/** An object containing information about a burn quote. */
export interface BurnQuote {
    /** The round that this quote is based on. */
    round: number;
    /** The ID of the first output asset in this quote. */
    asset1ID: number;
    /** The quantity of the first output asset in this quote. */
    asset1Out: bigint;
    /** The ID of the second output asset in this quote. */
    asset2ID: number;
    /** The quantity of the second output asset in this quote. */
    asset2Out: bigint;
    /** The ID of the input liquidity token asset in this quote. */
    liquidityID: number;
    /** The quantity of the input liquidity token asset in this quote. */
    liquidityIn: bigint;
}
/** An object containing information about a successfully executed  burn transaction. */
export interface BurnExecution {
    /** The round that the burn occurred in. */
    round: number;
    /**
     * The total amount of transaction fees that were spent (in microAlgos) to execute the burn and,
     * if applicable, redeem transactions.
     */
    fees: number;
    /** The ID of the first output asset. */
    asset1ID: number;
    /** The quantity of the first output asset. */
    asset1Out: bigint;
    /** The ID of the second output asset. */
    asset2ID: number;
    /** The quantity of the second output asset. */
    asset2Out: bigint;
    /** The ID of the liquidity token input asset. */
    liquidityID: number;
    /** The quantity of the liquidity token input asset. */
    liquidityIn: bigint;
    /** Excess amount details for the pool assets */
    excessAmounts: {
        assetID: number;
        excessAmountForBurning: bigint;
        totalExcessAmount: bigint;
    }[];
    /** The ID of the transaction. */
    txnID: string;
    /** The group ID for the transaction group. */
    groupID: string;
}
/**
 * Get a quote for how many of assets 1 and 2 a deposit of liquidityIn is worth at this moment. This
 * does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.liquidityIn The quantity of the liquidity being deposited.
 */
export declare function getBurnLiquidityQuote({ client, pool, liquidityIn }: {
    client: any;
    pool: PoolInfo;
    liquidityIn: number | bigint;
}): Promise<BurnQuote>;
/**
 * Execute a burn operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.liquidityIn The quantity of liquidity tokens being deposited.
 * @param params.asset1Out.amount The quantity of the first asset being withdrawn.
 * @param params.asset1Out.slippage The maximum acceptable slippage rate for asset1. Should be an
 *   integer between 0 and 100 and acts as a percentage of params.asset1Out.amount.
 * @param params.asset2Out.amount The quantity of the second asset being withdrawn.
 * @param params.asset2Out.slippage The maximum acceptable slippage rate for asset2. Should be an
 *   integer between 0 and 100 and acts as a percentage of params.asset2Out.amount.
 * @param params.initiatorAddr The address of the account performing the burn operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function burnLiquidity({ client, pool, liquidityIn, asset1Out, asset2Out, slippage, initiatorAddr, initiatorSigner }: {
    client: any;
    pool: PoolInfo;
    liquidityIn: number | bigint;
    asset1Out: number | bigint;
    asset2Out: number | bigint;
    slippage: number;
    initiatorAddr: string;
    initiatorSigner: InitiatorSigner;
}): Promise<BurnExecution>;
