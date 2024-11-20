/**
 * The minimum transaction fee for Algorand.
 * @deprecated This constant is no longer included in js-algorand-sdk v3. New code should use suggestedParams.minFee instead.
 */
export const ALGORAND_MIN_TX_FEE = 1000;

export const V1_1_SWAP_TXN_COUNT = 4;
export const V1_1_SWAP_TOTAL_FEE = V1_1_SWAP_TXN_COUNT * ALGORAND_MIN_TX_FEE;
