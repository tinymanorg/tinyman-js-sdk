import {AssetWithIdAndAmount} from "../util/asset/assetModels";
import {PoolReserves, V1PoolInfo, V2PoolInfo} from "../util/pool/poolTypes";

/** An object containing information about a swap quote. */
export interface SwapQuote {
  /** The ID of the input asset in this quote. */
  assetInID: number;
  /** The quantity of the input asset in this quote. */
  assetInAmount: bigint;
  /** The ID of the output asset in this quote. */
  assetOutID: number;
  /** The quantity of the output asset in this quote. */
  assetOutAmount: bigint;
  /** The amount of fee that may be spent (in the currency of the fixed asset) for the swap  */
  swapFee: number;
  /** The final exchange rate for this swap expressed as  assetOutAmount / assetInAmount */
  rate: number;
  /** The price impact of the swap */
  priceImpact: number;
  /** The round that this quote is based on. */
  round?: number;
}

/** An object containing information about a successfully executed swap. */
export interface V1SwapExecution {
  /** The round that the swap occurred in. */
  round: number;
  /**
   * The total amount of transaction fees that were spent (in microAlgos) to execute the swap and,
   * if applicable, redeem transactions.
   */
  fees: number;
  /** The ID of the swap's input asset. */
  assetInID: number;
  /** The amount of the swap's input asset. */
  assetInAmount: bigint;
  /** The ID of the swap's output asset. */
  assetOutID: number;
  /** The amount of the swap's output asset. */
  assetOutAmount: bigint;
  /** The ID of the transaction. */
  txnID: string;
  excessAmount: {
    /** Asset ID for which the excess amount can be redeemed with */
    assetID: number;
    /** Excess amount for the current swap */
    excessAmountForSwap: bigint;
    /** Total excess amount accumulated for the pool asset */
    totalExcessAmount: bigint;
  };
  /** The group ID for the transaction group. */
  groupID: string;
}

export interface V2SwapExecution {
  assetIn: AssetWithIdAndAmount;
  /** Can be `undefined` if the execution was successful, but there was an issue while
   * extracting the output asset data from the transaction response */
  assetOut: AssetWithIdAndAmount | undefined;
  pool: V2PoolInfo;
  txnID: string;
  round: number;
}

export interface SwapQuoteWithPool {
  quote: SwapQuote;
  pool: {info: V1PoolInfo | V2PoolInfo; reserves: PoolReserves};
}
