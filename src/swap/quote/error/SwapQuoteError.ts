export enum SwapQuoteErrorType {
  OutputAmountExceedsAvailableLiquidity = "OutputAmountExceedsAvailableLiquidity",
  InputAmountExceedsAvailableLiquidity = "InputAmountExceedsAvailableLiquidity",
  InsuffucientLiquidity = "InsuffucientLiquidity"
}

class SwapQuoteError extends Error {
  public type: SwapQuoteErrorType;

  constructor(message: string, type: SwapQuoteErrorType) {
    super(message);
    this.type = type;
  }
}

export default SwapQuoteError;
