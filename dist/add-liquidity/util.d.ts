import { CONTRACT_VERSION } from "../contract/constants";
import { V2AddLiquidityType } from "./v2/constants";
/**
 * @returns the total fee that will be paid by the user
 * for the add liquidity transaction with given parameters
 */
declare function getAddLiquidityTotalFee(params: {
    version: typeof CONTRACT_VERSION.V1_1;
} | {
    version: typeof CONTRACT_VERSION.V2;
    type: V2AddLiquidityType;
}): number;
export { getAddLiquidityTotalFee };
