import { SignerTransaction, InitiatorSigner, SupportedNetwork } from "../../util/commonTypes";
import { PoolReserves, V1PoolInfo } from "../../util/pool/poolTypes";
import { V1_1AddLiquidityQuote, V1_1AddLiquidityExecution } from "./types";
/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 */
export declare function getQuote({ pool, reserves, asset1In, asset2In }: {
    pool: V1PoolInfo;
    reserves: PoolReserves;
    asset1In: number | bigint;
    asset2In: number | bigint;
}): V1_1AddLiquidityQuote;
export declare function generateTxns({ client, network, poolAddress, asset_1, asset_2, liquidityToken, slippage, initiatorAddr }: {
    client: any;
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
}): Promise<SignerTransaction[]>;
export declare function signTxns({ pool, txGroup, initiatorSigner }: {
    pool: V1PoolInfo;
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
/**
 * Execute adding liquidity operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.liquidityOut The quantity of liquidity tokens being withdrawn.
 * @param params.slippage The maximum acceptable slippage rate. Should be a number between 0 and 100
 *   and acts as a percentage of params.liquidityOut.
 * @param params.initiatorAddr The address of the account performing the add liquidity operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function execute({ client, pool, txGroup, signedTxns, initiatorAddr }: {
    client: any;
    pool: V1PoolInfo;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    initiatorAddr: string;
}): Promise<V1_1AddLiquidityExecution>;
