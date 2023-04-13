export enum SwapQuoteErrorType {
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

class SwapQuoteError extends Error {
  type: SwapQuoteErrorType;
  message: string;

  constructor(type: SwapQuoteErrorType, message: string) {
    super(message);

    this.type = type;
    this.message = message;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SwapQuoteError);
    }
  }
}

export default SwapQuoteError;
