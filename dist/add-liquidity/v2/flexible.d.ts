import { Algodv2 } from "algosdk";
import { SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { V2FlexibleAddLiquidityQuote } from "./types";
import { AssetWithAmountAndDecimals, AssetWithIdAndAmount } from "../../util/asset/assetModels";
export * from "./common";
/**
 * @returns A quote for the given asset 1 and asset 2 values.
 * This does not execute any transactions.
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
