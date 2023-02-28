class OutputAmountExceedsAvailableLiquidityError extends Error {
  constructor(message = "Output amount exceeds available liquidity") {
    super(message);
  }
}

export default OutputAmountExceedsAvailableLiquidityError;
