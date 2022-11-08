import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { SupportedNetwork } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { InitialMintQuote } from "../types";
export * from "./common";
export declare function getQuote({ pool, asset1In, asset2In, slippage }: {
    pool: V2PoolInfo;
    asset1In: number | bigint;
    asset2In: number | bigint;
    slippage?: number;
}): InitialMintQuote;
export declare function generateTxns({ client, pool, network, poolAddress, asset_1, asset_2, liquidityToken, initiatorAddr }: {
    client: AlgodClient;
    pool: V2PoolInfo;
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
