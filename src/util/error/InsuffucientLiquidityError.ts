export enum InsuffucientLiquidityErrorType {
  OutputAmountExceedsAvailableLiquidity = "OutputAmountExceedsAvailableLiquidity",
  InputAmountExceedsAvailableLiquidity = "InputAmountExceedsAvailableLiquidity",
  InsuffucientLiquidity = "InsuffucientLiquidity"
}

class InsuffucientLiquidityError extends Error {
  public type: InsuffucientLiquidityErrorType;

  constructor(message: string, type: InsuffucientLiquidityErrorType) {
    super(message);
    this.type = type;
  }
}

export default InsuffucientLiquidityError;
