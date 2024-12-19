import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapRoute, SwapRouterResponse } from "../../types";
declare function getSwapRouteRate(route: SwapRouterResponse): number;
declare function getSwapRouterAppID(network: SupportedNetwork): number;
declare function getAssetOutFromSwapRoute(route: SwapRouterResponse): {
    asset: Pick<import("../../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
    amount: bigint;
};
declare function getAssetInFromSwapRoute(route: SwapRouterResponse): {
    asset: Pick<import("../../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
    amount: bigint;
};
declare function getAssetInAndOutFromSwapRoute(route: SwapRouterResponse): {
    assetIn: {
        asset: Pick<import("../../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
        amount: bigint;
    };
    assetOut: {
        asset: Pick<import("../../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
        amount: bigint;
    };
};
declare function getSwapRouteFromRouterResponse(routerResponse: SwapRouterResponse): SwapRoute[];
export { getAssetInAndOutFromSwapRoute, getAssetInFromSwapRoute, getAssetOutFromSwapRoute, getSwapRouteFromRouterResponse, getSwapRouterAppID, getSwapRouteRate };
