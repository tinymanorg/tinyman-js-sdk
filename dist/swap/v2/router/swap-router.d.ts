import algosdk, { Transaction } from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { SwapType } from "../../constants";
import { FetchSwapRouteQuotesResponse, GenerateSwapRouterTxnsParams } from "../../types";
export declare function generateSwapRouterAssetOptInTransaction({ client, routerAppID, assetIDs, accountAddress }: {
    client: AlgodClient;
    routerAppID: number;
    assetIDs: number[];
    accountAddress: string;
}): Promise<Transaction>;
export declare function generateSwapRouterTxns({ initiatorAddr, client, network, swapType, route }: GenerateSwapRouterTxnsParams): Promise<{
    txn: algosdk.Transaction;
    signers: string[];
}[]>;
export declare function getSwapRouterAppOptInRequiredAssetIDs({ client, routerAppID, assetIDs }: {
    client: AlgodClient;
    routerAppID: number;
    assetIDs: number[];
}): Promise<number[]>;
export declare function getSwapRoute({ amount, assetInID, assetOutID, swapType }: {
    assetInID: number;
    assetOutID: number;
    swapType: SwapType;
    amount: number | bigint;
}): Promise<FetchSwapRouteQuotesResponse>;
