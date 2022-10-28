import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { InitiatorSigner, SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { PoolInfo, PoolReserves } from "../../util/pool/poolTypes";
import { MintExecution } from "../types";
/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 */
export declare function getQuote({ pool, reserves, asset1In, asset2In, slippage }: {
    pool: PoolInfo;
    reserves: PoolReserves;
    asset1In: number | bigint;
    asset2In: number | bigint;
    slippage?: number;
}): {
    asset1ID: number;
    asset2ID: number;
    asset1In: bigint;
    asset2In: bigint;
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
export declare function generateTxns({ client, pool, network, poolAddress, asset_1, asset_2, liquidityToken, initiatorAddr }: {
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
    initiatorAddr: string;
}): Promise<{
    txn: algosdk.Transaction;
    signers: string[];
}[]>;
export declare function signTxns({ txGroup, initiatorSigner }: {
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
/**
 * Execute a mint operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.liquidityOut The quantity of liquidity tokens being withdrawn.
 * @param params.slippage The maximum acceptable slippage rate. Should be a number between 0 and 100
 *   and acts as a percentage of params.liquidityOut.
 * @param params.initiatorAddr The address of the account performing the mint operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function execute({ client, pool, txGroup, signedTxns }: {
    client: any;
    pool: PoolInfo;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
}): Promise<MintExecution>;
