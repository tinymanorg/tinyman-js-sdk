import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapRouterResponse } from "../../types";
declare function getSwapRouteRate(route: Pick<SwapRouterResponse, "asset_in" | "asset_out" | "amount" | "output_amount">): number;
declare function getSwapRouterAppID(network: SupportedNetwork): number;
declare function getAssetOutFromSwapRoute(route: Pick<SwapRouterResponse, "asset_out" | "output_amount">): {
    asset: Pick<import("../../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
    amount: bigint;
};
declare function getAssetInFromSwapRoute(route: Pick<SwapRouterResponse, "asset_in" | "amount">): {
    asset: Pick<import("../../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
    amount: bigint;
};
declare function getAssetInAndOutFromSwapRoute(route: Pick<SwapRouterResponse, "asset_in" | "asset_out" | "amount" | "output_amount">): {
    assetIn: {
        asset: Pick<import("../../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
        amount: bigint;
    };
    assetOut: {
        asset: Pick<import("../../..").TinymanAnalyticsApiAsset, "id" | "decimals" | "name" | "unit_name">;
        amount: bigint;
    };
};
export { getAssetInAndOutFromSwapRoute, getAssetInFromSwapRoute, getAssetOutFromSwapRoute, getSwapRouterAppID, getSwapRouteRate };
