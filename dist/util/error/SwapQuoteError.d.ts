export declare enum SwapQuoteErrorType {
    SwapRouterStaleDataError = "SwapRouterStaleDataError",
    SwapRouterNoRouteError = "SwapRouterNoRouteError",
    SwapRouterLowSwapAmountError = "SwapRouterLowSwapAmountError",
    SwapRouterInsufficientReservesError = "SwapRouterInsufficientReservesError",
    SwapRouterPoolHasNoLiquidityError = "SwapRouterPoolHasNoLiquidityError",
    NoAvailablePoolError = "NoAvailablePoolError",
    OutputAmountExceedsAvailableLiquidityError = "OutputAmountExceedsAvailableLiquidityError",
    UnknownError = "UnknownError",
    LowSwapAmountError = "LowSwapAmountError",
    AssetDoesNotBelongToPoolError = "AssetDoesNotBelongToPoolError",
    InvalidSwapTypeError = "InvalidSwapTypeError"
}
declare class SwapQuoteError extends Error {
    type: SwapQuoteErrorType;
    message: string;
    constructor(type: SwapQuoteErrorType, message: string);
}
export default SwapQuoteError;
