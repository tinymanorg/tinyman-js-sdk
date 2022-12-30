import {CONTRACT_VERSION} from "../contract/constants";
import {V1_1_ADD_LIQUIDITY_TOTAL_FEE} from "./v1_1/constants";
import {V2AddLiquidityType} from "./v2/constants";
import {getV2AddLiquidityTotalFee} from "./v2/util";

/**
 * @returns the total fee that will be paid by the user
 * for the add liquidity transaction with given parameters
 */
function getAddLiquidityTotalFee(
  params:
    | {
        version: typeof CONTRACT_VERSION.V1_1;
      }
    | {
        version: typeof CONTRACT_VERSION.V2;
        type: V2AddLiquidityType;
      }
) {
  switch (params.version) {
    case CONTRACT_VERSION.V1_1:
      return V1_1_ADD_LIQUIDITY_TOTAL_FEE;

    case CONTRACT_VERSION.V2:
      return getV2AddLiquidityTotalFee(params.type);

    default:
      throw new Error("Provided contract version was not valid.");
  }
}

export {getAddLiquidityTotalFee};
