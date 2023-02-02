import { Algodv2 } from "algosdk";
import { SignerTransaction, InitiatorSigner, SupportedNetwork } from "../../util/commonTypes";
import { PoolReserves, V1PoolInfo } from "../../util/pool/poolTypes";
import { V1_1AddLiquidityQuote, V1_1AddLiquidityExecution } from "./types";
import { AssetWithIdAndAmount } from "../../util/asset/assetModels";
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
export declare function generateTxns({ client, network, poolAddress, asset1In, asset2In, poolTokenOut, slippage, initiatorAddr }: {
    client: Algodv2;
    network: SupportedNetwork;
    poolAddress: string;
    asset1In: AssetWithIdAndAmount;
    asset2In: AssetWithIdAndAmount;
    poolTokenOut: AssetWithIdAndAmount;
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
 * @param params.initiatorAddr The address of the account performing the add liquidity operation.
 */
export declare function execute({ client, pool, txGroup, signedTxns, initiatorAddr }: {
    client: Algodv2;
    pool: V1PoolInfo;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    initiatorAddr: string;
}): Promise<V1_1AddLiquidityExecution>;
