import {SupportedNetwork} from "../../../util/commonTypes";
import {SwapType} from "../../constants";

export const SWAP_ROUTER_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 184778019,
  mainnet: 1083651166
};

/**
 * Inner txn counts according to the swap type
 */
export const SWAP_ROUTER_INNER_TXN_COUNT: Record<SwapType, number> = {
  [SwapType.FixedInput]: 7,
  [SwapType.FixedOutput]: 8
} as const;

export enum V2SwapRouterSwapAppCallArgsIndices {
  TxnType = 0,
  InputAmount = 1,
  OutputAmount = 2,
  Routes = 3,
  Pools = 4,
  Swaps = 5
}

export enum V2SwapRouterAppCallArgsTxnType {
  Swap = "swap",
  AssetOptIn = "asset_opt_in",
  Noop = "noop"
}

export const SWAP_ROUTER_SWAP_APP_CALL_ARGS_LENGTH = 6;
