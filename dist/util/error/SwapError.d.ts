export declare enum SwapErrorType {
    SwapRouterStaleDataError = "SwapRouterStaleDataError",
    SwapRouterNoRouteError = "SwapRouterNoRouteError",
    SwapRouterLowSwapAmountError = "SwapRouterLowSwapAmountError",
    SwapRouterInsufficientReservesError = "SwapRouterInsufficientReservesError",
    SwapRouterPoolHasNoLiquidityError = "SwapRouterPoolHasNoLiquidityError",
    NoAvailablePoolError = "NoAvailablePoolError",
    OutputAmountExceedsAvailableLiquidityError = "OutputAmountExceedsAvailableLiquidityError"
}
declare class SwapError extends Error {
    type: SwapErrorType;
    message: string;
    constructor(type: SwapErrorType, message: string);
}
export default SwapError;
