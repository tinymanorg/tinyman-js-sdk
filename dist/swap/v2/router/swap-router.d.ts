import algosdk, { Algodv2, SuggestedParams } from "algosdk";
import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapType } from "../../constants";
import { SwapRouterResponse, SwapRouterTransactionRecipe } from "../../types";
export declare function generateSwapRouterTxns({ initiatorAddr, client, route }: {
    client: Algodv2;
    initiatorAddr: string;
    route: SwapRouterResponse;
}): Promise<{
    txn: algosdk.Transaction;
    signers: string[];
}[]>;
export declare function generateSwapRouterTxnFromRecipe(recipe: SwapRouterTransactionRecipe, suggestedParams: SuggestedParams, userAddress: string): algosdk.Transaction;
export declare function getSwapRoute({ amount, assetInID, assetOutID, swapType, network, slippage }: {
    assetInID: number;
    assetOutID: number;
    swapType: SwapType;
    amount: number | bigint;
    network: SupportedNetwork;
    slippage: number;
}): Promise<SwapRouterResponse>;
