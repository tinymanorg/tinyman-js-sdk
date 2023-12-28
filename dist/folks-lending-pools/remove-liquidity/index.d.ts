import algosdk, { Algodv2 } from "algosdk";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { SupportedNetwork } from "../../util/commonTypes";
export declare function generateTxns({ client, pool, poolTokenIn, initiatorAddr, lendingAsset1, lendingAsset2, lendingManagerId, network }: {
    client: Algodv2;
    pool: V2PoolInfo;
    poolTokenIn: number | bigint;
    initiatorAddr: string;
    minAsset1Amount: number | bigint;
    minAsset2Amount: number | bigint;
    lendingAsset1: {
        id: number;
        appId: number;
    };
    lendingAsset2: {
        id: number;
        appId: number;
    };
    lendingManagerId: number;
    slippage: number;
    network: SupportedNetwork;
}): Promise<algosdk.Transaction[]>;
