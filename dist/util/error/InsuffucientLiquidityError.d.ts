export declare enum InsuffucientLiquidityErrorType {
    OutputAmountExceedsAvailableLiquidity = "OutputAmountExceedsAvailableLiquidity",
    InputAmountExceedsAvailableLiquidity = "InputAmountExceedsAvailableLiquidity",
    InsuffucientLiquidity = "InsuffucientLiquidity"
}
declare class InsuffucientLiquidityError extends Error {
    type: InsuffucientLiquidityErrorType;
    constructor(message: string, type: InsuffucientLiquidityErrorType);
}
export default InsuffucientLiquidityError;
