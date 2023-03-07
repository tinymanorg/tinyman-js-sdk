import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapType } from "../../constants";
export declare const SWAP_ROUTER_APP_ID: Record<SupportedNetwork, number>;
/**
 * Inner txn counts according to the swap type
 */
export declare const SWAP_ROUTER_INNER_TXN_COUNT: Record<SwapType, number>;
declare const TINYMAN_ANALYTICS_API_BASE_URLS: Record<SupportedNetwork, {
    base: string;
    v1: string;
}>;
export { TINYMAN_ANALYTICS_API_BASE_URLS };
