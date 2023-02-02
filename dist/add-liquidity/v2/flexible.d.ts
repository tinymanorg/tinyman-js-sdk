import { Algodv2 } from "algosdk";
import { SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { V2FlexibleAddLiquidityQuote } from "./types";
import { AssetWithAmountAndDecimals, AssetWithIdAndAmount } from "../../util/asset/assetModels";
export * from "./common";
/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.slippage The maximum slippage allowed for the swap.
 */
export declare function getQuote({ pool, slippage, asset1, asset2 }: {
    pool: V2PoolInfo;
    asset1: AssetWithAmountAndDecimals;
    asset2: AssetWithAmountAndDecimals;
    slippage?: number;
}): V2FlexibleAddLiquidityQuote;
export declare function generateTxns({ client, network, poolAddress, asset1In, asset2In, poolTokenOut, initiatorAddr, minPoolTokenAssetAmount }: {
    client: Algodv2;
    network: SupportedNetwork;
    poolAddress: string;
    asset1In: AssetWithIdAndAmount;
    asset2In: AssetWithIdAndAmount;
    poolTokenOut: AssetWithIdAndAmount;
    initiatorAddr: string;
    minPoolTokenAssetAmount: bigint;
}): Promise<SignerTransaction[]>;
