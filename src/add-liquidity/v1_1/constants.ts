import {ALGORAND_MIN_TX_FEE} from "algosdk";

export enum V1_1AddLiquidityTxnIndices {
  FEE_TXN = 0,
  VALIDATOR_APP_CALL_TXN,
  ASSET1_IN_TXN,
  ASSET2_IN_TXN,
  LIQUDITY_OUT_TXN
}

export const V1_1_ADD_LIQUIDITY_PROCESS_TXN_COUNT = 5;
export const V1_1_ADD_LIQUIDITY_TOTAL_FEE =
  V1_1_ADD_LIQUIDITY_PROCESS_TXN_COUNT * ALGORAND_MIN_TX_FEE;
