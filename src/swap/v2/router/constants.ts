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

/**
 * The minimum transaction fee for Algorand.
 * @deprecated This constant is no longer included in js-algorand-sdk v3. New code should use suggestedParams.minFee instead.
 */
export const ALGORAND_MIN_TX_FEE = 1000;