import algosdk, { Algodv2, Transaction } from "algosdk";
import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapType } from "../../constants";
import { SwapRouterResponse, SwapRoute } from "../../types";
/**
 * Generates txns that would opt in the Swap Router Application to the assets used in the swap router
 */
export declare function generateSwapRouterAssetOptInTransaction({ client, routerAppID, assetIDs, initiatorAddr }: {
    client: Algodv2;
    routerAppID: number;
    assetIDs: number[];
    initiatorAddr: string;
}): Promise<Transaction>;
export declare function generateSwapRouterTxns({ initiatorAddr, client, network, swapType, route, slippage }: {
    client: Algodv2;
    initiatorAddr: string;
    swapType: SwapType;
    route: SwapRoute;
    network: SupportedNetwork;
    slippage: number;
}): Promise<{
    txn: algosdk.Transaction;
    signers: string[];
}[]>;
export declare function getSwapRouterAppOptInRequiredAssetIDs({ client, network, assetIDs }: {
    client: Algodv2;
    network: SupportedNetwork;
    assetIDs: number[];
}): Promise<number[]>;
export declare function getSwapRoute({ amount, assetInID, assetOutID, swapType, network }: {
    assetInID: number;
    assetOutID: number;
    swapType: SwapType;
    amount: number | bigint;
    network: SupportedNetwork;
}): Promise<SwapRouterResponse>;
