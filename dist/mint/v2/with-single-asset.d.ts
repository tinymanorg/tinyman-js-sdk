import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { SupportedNetwork } from "../../util/commonTypes";
import { PoolInfo } from "../../util/pool/poolTypes";
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
