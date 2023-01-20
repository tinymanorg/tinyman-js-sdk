export declare enum SwapQuoteErrorType {
    OutputAmountExceedsAvailableLiquidity = "OutputAmountExceedsAvailableLiquidity",
    InputAmountExceedsAvailableLiquidity = "InputAmountExceedsAvailableLiquidity",
    InsuffucientLiquidity = "InsuffucientLiquidity"
}
declare class SwapQuoteError extends Error {
    type: SwapQuoteErrorType;
    constructor(message: string, type: SwapQuoteErrorType);
}
export default SwapQuoteError;
