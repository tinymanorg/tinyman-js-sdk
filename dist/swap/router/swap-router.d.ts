import algosdk, { Algodv2 } from "algosdk";
import { SupportedNetwork } from "../../util/commonTypes";
import { SwapType } from "../constants";
import { SwapRouterResponse } from "../types";
export declare function generateSwapRouterTxns({ initiatorAddr, client, route }: {
    client: Algodv2;
    initiatorAddr: string;
    route: SwapRouterResponse;
}): Promise<{
    txn: algosdk.Transaction;
    signers: string[];
}[]>;
export declare function getSwapRoute({ amount, assetInID, assetOutID, swapType, network, slippage }: {
    assetInID: number;
    assetOutID: number;
    swapType: SwapType;
    amount: number | bigint;
    network: SupportedNetwork;
    slippage: string;
}): Promise<SwapRouterResponse>;
