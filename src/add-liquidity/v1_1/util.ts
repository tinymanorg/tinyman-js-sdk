import {V1_1_ADD_LIQUIDITY_PROCESS_TXN_COUNT} from "./constants";

/**
 * @returns the total fee for the add liquidity operation.
 */
export function getV1_1AddLiquidityTotalFee(minFee: bigint) {
  return BigInt(V1_1_ADD_LIQUIDITY_PROCESS_TXN_COUNT) * minFee;
}
