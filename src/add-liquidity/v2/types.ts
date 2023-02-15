import {
  AssetWithIdAndAmount,
  AssetWithIdAndAmountAndDecimals
} from "../../util/asset/assetModels";

export interface V2InitialAddLiquidityQuote {
  asset1In: {id: number; amount: bigint};
  asset2In: {id: number; amount: bigint};
  poolTokenOut: {id: number; amount: bigint};
  slippage: number;
}

export interface V2FlexibleAddLiquidityQuote {
  asset1In: {id: number; amount: bigint};
  asset2In: {id: number; amount: bigint};
  poolTokenOut: {id: number; amount: bigint};
  share: number;
  slippage: number;
  internalSwapQuote: V2AddLiquidityInternalSwapQuote;
  minPoolTokenAssetAmountWithSlippage: bigint;
}

export interface V2SingleAssetInAddLiquidityQuote {
  assetIn: {id: number; amount: bigint};
  poolTokenOut: {id: number; amount: bigint};
  share: number;
  slippage: number;
  internalSwapQuote: V2AddLiquidityInternalSwapQuote;
  minPoolTokenAssetAmountWithSlippage: bigint;
}

export interface V2AddLiquidityInternalSwapQuote {
  assetIn: AssetWithIdAndAmountAndDecimals;
  assetOut: AssetWithIdAndAmountAndDecimals;
  swapFees: bigint;
  priceImpact: number;
}

export interface V2AddLiquidityExecution {
  /** The round that the add liquidity occurred in. */
  round: number;
  /** The ID of the transaction. */
  txnID: string;
  /**
   * The total amount of transaction fees that were spent (in microAlgos) to execute the add liquidity and,
   * if applicable, redeem transactions.
   */
  fees: number;
  /** The ID of the output pool token asset. */
  poolTokenID: number;
  /** The group ID for the transaction group. */
  groupID: string;
  /**
   * Can be `undefined` if the execution was successful, but there was an issue while
   * extracting the output asset data fron the transaction response
   */
  assetOut: AssetWithIdAndAmount | undefined;
}
