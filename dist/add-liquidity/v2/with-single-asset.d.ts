import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { V2SingleAssetInAddLiquidityQuote } from "./types";
export * from "./common";
export declare function getQuote({ pool, assetIn, slippage, decimals }: {
    pool: V2PoolInfo;
    assetIn: AssetWithIdAndAmount;
    decimals: {
        asset1: number;
        asset2: number;
    };
    slippage?: number;
}): V2SingleAssetInAddLiquidityQuote;
export declare function generateTxns({ client, network, poolAddress, assetIn, poolTokenId, initiatorAddr, minPoolTokenAssetAmount }: {
    client: AlgodClient;
    network: SupportedNetwork;
    poolAddress: string;
    assetIn: AssetWithIdAndAmount;
    poolTokenId: number;
    initiatorAddr: string;
    minPoolTokenAssetAmount: bigint;
}): Promise<SignerTransaction[]>;
