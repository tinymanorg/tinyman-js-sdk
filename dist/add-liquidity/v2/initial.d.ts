import { Algodv2 } from "algosdk";
import { AssetWithAmountAndDecimals, AssetWithIdAndAmount } from "../../util/asset/assetModels";
import { SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { V2InitialAddLiquidityQuote } from "./types";
export * from "./common";
export declare function getQuote({ pool, asset1, asset2, slippage }: {
    pool: V2PoolInfo;
    asset1: AssetWithAmountAndDecimals;
    asset2: AssetWithAmountAndDecimals;
    slippage?: number;
}): V2InitialAddLiquidityQuote;
export declare function generateTxns({ client, pool, network, poolAddress, asset1In, asset2In, poolTokenId, initiatorAddr }: {
    client: Algodv2;
    pool: V2PoolInfo;
    network: SupportedNetwork;
    poolAddress: string;
    asset1In: AssetWithIdAndAmount;
    asset2In: AssetWithIdAndAmount;
    poolTokenId: number;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
