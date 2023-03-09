import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapRoute } from "../../types";
declare function getSwapRouteRate(route: SwapRoute): number;
declare function getSwapRouterAppID(network: SupportedNetwork): number;
declare function getAssetOutFromSwapRoute(route: SwapRoute): {
    asset: import("../../types").SwapRouteAsset;
    amount: string;
};
declare function getAssetInFromSwapRoute(route: SwapRoute): {
    asset: import("../../types").SwapRouteAsset;
    amount: string;
};
declare function getAssetInAndOutFromSwapRoute(route: SwapRoute): {
    assetIn: {
        asset: import("../../types").SwapRouteAsset;
        amount: string;
    };
    assetOut: {
        asset: import("../../types").SwapRouteAsset;
        amount: string;
    };
};
export { getSwapRouteRate, getSwapRouterAppID, getAssetOutFromSwapRoute, getAssetInFromSwapRoute, getAssetInAndOutFromSwapRoute };
