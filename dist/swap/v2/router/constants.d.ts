import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapType } from "../../constants";
export declare const SWAP_ROUTER_APP_ID: Record<SupportedNetwork, number>;
/**
 * Inner txn counts according to the swap type
 */
export declare const SWAP_ROUTER_INNER_TXN_COUNT: Record<SwapType, number>;
export declare enum V2SwapRouterSwapAppCallArgsIndices {
    TxnType = 0,
    InputAmount = 1,
    OutputAmount = 2,
    Routes = 3,
    Pools = 4,
    Swaps = 5
}
export declare enum V2SwapRouterAppCallArgsTxnType {
    Swap = "swap",
    AssetOptIn = "asset_opt_in",
    Noop = "noop"
}
export declare const SWAP_ROUTER_SWAP_APP_CALL_ARGS_LENGTH = 6;
