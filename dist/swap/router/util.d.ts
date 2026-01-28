import { SupportedNetwork } from "../../util/commonTypes";
import { SwapRouterResponse } from "../types";
declare function getSwapRouteRate(route: Pick<SwapRouterResponse, "input_asset" | "output_asset" | "input_amount" | "output_amount">): number;
declare function getSwapRouterAppID(network: SupportedNetwork): number;
declare function getAssetOutFromSwapRoute(route: Pick<SwapRouterResponse, "output_asset" | "output_amount">): {
    asset: Pick<import("../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
    amount: bigint;
};
declare function getAssetInFromSwapRoute(route: Pick<SwapRouterResponse, "input_asset" | "input_amount">): {
    asset: Pick<import("../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
    amount: bigint;
};
declare function getAssetInAndOutFromSwapRoute(route: Pick<SwapRouterResponse, "input_asset" | "output_asset" | "input_amount" | "output_amount">): {
    assetIn: {
        asset: Pick<import("../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
        amount: bigint;
    };
    assetOut: {
        asset: Pick<import("../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
        amount: bigint;
    };
};
export { getAssetInAndOutFromSwapRoute, getAssetInFromSwapRoute, getAssetOutFromSwapRoute, getSwapRouterAppID, getSwapRouteRate };
