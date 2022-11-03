import {getContract} from "../../contract";
import {ContractVersionValue} from "../../contract/types";
import {
  BASE_MINIMUM_BALANCE,
  MINIMUM_BALANCE_REQUIRED_PER_ASSET,
  MINIMUM_BALANCE_REQUIRED_PER_APP,
  MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE,
  MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA
} from "../../util/constant";

/**
 * @returns Minimum balance for a pool account
 */
export function getPoolAccountMinBalance(
  contractVersion: ContractVersionValue,
  isAlgoPool: boolean
) {
  let {
    schema: {numLocalInts, numLocalByteSlices}
  } = getContract(contractVersion);

  let fee =
    BASE_MINIMUM_BALANCE +
    MINIMUM_BALANCE_REQUIRED_PER_ASSET + // min balance to create asset
    MINIMUM_BALANCE_REQUIRED_PER_ASSET + // fee + min balance to opt into asset 1
    MINIMUM_BALANCE_REQUIRED_PER_APP + // min balance to opt into validator app
    MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE * numLocalInts +
    MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA * numLocalByteSlices;

  if (!isAlgoPool) {
    fee += MINIMUM_BALANCE_REQUIRED_PER_ASSET; // min balance to opt into asset 2
  }

  return fee;
}
