import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { V2SingleAssetInAddLiquidityQuote } from "./types";
export * from "./common";
export declare function getQuote({ pool, assetIn, slippage, decimals }: {
    pool: V2PoolInfo;
    assetIn: {
        id: number;
        amount: number | bigint;
    };
    decimals: {
        asset1: number;
        asset2: number;
    };
    slippage?: number;
}): V2SingleAssetInAddLiquidityQuote;
export declare function generateTxns({ client, network, poolAddress, assetIn, liquidityToken, initiatorAddr, minPoolTokenAssetAmount }: {
    client: AlgodClient;
    network: SupportedNetwork;
    poolAddress: string;
    assetIn: {
        id: number;
        amount: number | bigint;
    };
    liquidityToken: {
        id: number;
        amount: number | bigint;
    };
    initiatorAddr: string;
    minPoolTokenAssetAmount: bigint;
}): Promise<{
    txn: algosdk.Transaction;
    signers: string[];
}[]>;
