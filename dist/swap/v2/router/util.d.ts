import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapRoute, SwapRouterQuote } from "../../types";
export declare function getSwapFeesFromSwapRoute(route: SwapRouterQuote[]): number;
export declare function getSwapRouteRate(route: SwapRoute): number;
export declare function getSwapRouterAppID(network: SupportedNetwork): number;
