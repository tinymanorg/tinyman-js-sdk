import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapRoute } from "../../types";
export declare function getSwapRouteRate(route: SwapRoute): number;
export declare function getSwapRouterAppID(network: SupportedNetwork): number;
export declare function getAssetOutFromSwapRoute(route: SwapRoute): {
    asset: import("../../types").SwapRouteAsset;
    amount: string;
};
export declare function getAssetInFromSwapRoute(route: SwapRoute): {
    asset: import("../../types").SwapRouteAsset;
    amount: string;
};
