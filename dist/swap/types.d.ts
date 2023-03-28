import { Algodv2 } from "algosdk";
import { AssetWithIdAndAmount, TinymanAnalyticsApiAsset } from "../util/asset/assetModels";
import { SignerTransaction, SupportedNetwork } from "../util/commonTypes";
import { PoolReserves, V1PoolInfo, V2PoolInfo } from "../util/pool/poolTypes";
import { SwapType } from "./constants";
export declare enum SwapQuoteType {
    Direct = "direct",
    Router = "router"
}
export interface DirectSwapQuote {
    /** The ID of the input asset in this quote. */
    assetInID: number;
    /** The quantity of the input asset in this quote. */
    assetInAmount: bigint;
    /** The ID of the output asset in this quote. */
    assetOutID: number;
    /** The quantity of the output asset in this quote. */
    assetOutAmount: bigint;
    /** The amount of fee that may be spent (in the currency of the fixed asset) for the swap  */
    swapFee: number;
    /** The final exchange rate for this swap expressed as  assetOutAmount / assetInAmount */
    rate: number;
    /** The price impact of the swap */
    priceImpact: number;
    /** The round that this quote is based on. */
    round?: number;
}
export interface DirectSwapQuoteAndPool {
    quote: DirectSwapQuote;
    pool: V1PoolInfo | V2PoolInfo;
}
export interface SwapRouteAsset {
    id: string;
    name: string;
    unit_name: string;
    decimals: number;
}
export interface SwapRoutePool {
    address: string;
    asset_1: SwapRouteAsset;
    asset_2: SwapRouteAsset;
    version: "2.0";
}
export type SwapRoute = {
    quote: SwapRouterQuote;
    pool: SwapRoutePool;
}[];
export interface SwapRouterQuote {
    swap_type: SwapType;
    amount_in: {
        asset: SwapRouteAsset;
        amount: string;
    };
    amount_out: {
        asset: SwapRouteAsset;
        amount: string;
    };
    swap_fees: {
        amount: string;
        asset: SwapRouteAsset;
    };
    price: number;
    price_impact: number;
}
export interface FetchSwapRouteQuotesPayload {
    asset_in_id: string;
    asset_out_id: string;
    amount: string;
    swap_type: SwapType;
}
export type SwapRouterResponse = FetchSwapRouteQuotesPayload & {
    route: SwapRoute;
    price_impact: string;
    status: {
        round_number: string;
        round_datetime: string;
    };
};
export type GetSwapQuoteParams = {
    assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
    assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
    pools: {
        info: V1PoolInfo | V2PoolInfo;
        reserves: PoolReserves;
    }[];
    amount: number | bigint;
    type: SwapType;
    network: SupportedNetwork;
    /** If `true`, the function will also check the quotes that use swap route */
    isSwapRouterEnabled?: boolean;
};
export type SwapQuote = {
    data: DirectSwapQuoteAndPool;
    type: SwapQuoteType.Direct;
} | {
    data: SwapRouterResponse;
    type: SwapQuoteType.Router;
};
export type GetSwapQuoteBySwapTypeParams = Omit<GetSwapQuoteParams, "type">;
export interface GenerateSwapTxnsParams {
    client: Algodv2;
    network: SupportedNetwork;
    quote: SwapQuote;
    swapType: SwapType;
    slippage: number;
    initiatorAddr: string;
}
export type GenerateV1_1SwapTxnsParams = Omit<GenerateSwapTxnsParams, "quote" | "network"> & {
    quoteAndPool: DirectSwapQuoteAndPool;
};
/** An object containing information about a successfully executed swap. */
export interface V1SwapExecution {
    /** The round that the swap occurred in. */
    round: number;
    /**
     * The total amount of transaction fees that were spent (in microAlgos) to execute the swap and,
     * if applicable, redeem transactions.
     */
    fees: number;
    /** The ID of the swap's input asset. */
    assetInID: number;
    /** The amount of the swap's input asset. */
    assetInAmount: bigint;
    /** The ID of the swap's output asset. */
    assetOutID: number;
    /** The amount of the swap's output asset. */
    assetOutAmount: bigint;
    /** The ID of the transaction. */
    txnID: string;
    excessAmount: {
        /** Asset ID for which the excess amount can be redeemed with */
        assetID: number;
        /** Excess amount for the current swap */
        excessAmountForSwap: bigint;
        /** Total excess amount accumulated for the pool asset */
        totalExcessAmount: bigint;
    };
    /** The group ID for the transaction group. */
    groupID: string;
}
export interface V2SwapExecution {
    assetIn: AssetWithIdAndAmount;
    /** Can be `undefined` if the execution was successful, but there was an issue while
     * extracting the output asset data from the transaction response */
    assetOut: AssetWithIdAndAmount | undefined;
    quote: SwapQuote;
    txnID: string;
    round: number;
}
export interface ExecuteSwapCommonParams {
    swapType: SwapType;
    client: Algodv2;
    network: SupportedNetwork;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    assetIn: AssetWithIdAndAmount;
}
