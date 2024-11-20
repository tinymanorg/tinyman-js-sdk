import {encodeString} from "../../util/util";

export const V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT = 2;
export const V2_REMOVE_LIQUIDITY_APP_ARGUMENT = encodeString("remove_liquidity");
export enum V2RemoveLiquidityTxnIndices {
  ASSET_TRANSFER_TXN = 0,
  APP_CALL_TXN
}

/**
 * The minimum transaction fee for Algorand.
 * @deprecated This constant is no longer included in js-algorand-sdk v3. New code should use suggestedParams.minFee instead.
 */
export const ALGORAND_MIN_TX_FEE = 1000;
