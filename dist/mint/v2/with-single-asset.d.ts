import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { SupportedNetwork } from "../../util/commonTypes";
import { PoolInfo, PoolReserves } from "../../util/pool/poolTypes";
export * from "./common";
/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 */
export declare function getQuote({ pool, reserves, assetIn, slippage }: {
    pool: PoolInfo;
    reserves: PoolReserves;
    assetIn: {
        id: number;
        amount: number | bigint;
    };
    slippage?: number;
}): {
    asset1ID: number;
    asset2ID: number;
    assetIn: bigint;
    liquidityOut: bigint;
    liquidityID: number;
    round: number;
    share: number;
    slippage: number;
    swapQuote: {
        amountIn: bigint;
        amountOut: bigint;
        swapFees: bigint;
        priceImpact: bigint;
    };
};
export declare function generateTxns({ client, network, poolAddress, asset_1, asset_2, liquidityToken, initiatorAddr }: {
    client: AlgodClient;
    pool: PoolInfo;
    network: SupportedNetwork;
    poolAddress: string;
    asset_1: {
        id: number;
        amount: number | bigint;
    };
    asset_2: {
        id: number;
        amount: number | bigint;
    };
    liquidityToken: {
        id: number;
        amount: number | bigint;
    };
    slippage: number;
    initiatorAddr: string;
}): Promise<{
    txn: algosdk.Transaction;
    signers: string[];
}[]>;
