import {V1_1_SWAP_TXN_COUNT} from "./constants";

export function getV1SwapTotalFee(minTxnFee: bigint) {
  return BigInt(V1_1_SWAP_TXN_COUNT) * minTxnFee;
}
