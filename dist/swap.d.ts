import {Algodv2} from "algosdk";
import {InitiatorSigner, SignerTransaction} from "./util/commonTypes";
import {PoolInfo, PoolReserves} from "./util/pool/poolTypes";
export declare enum SwapType {
  FixedInput = "fixed-input",
  FixedOutput = "fixed-output"
}
/** An object containing information about a swap quote. */
export interface SwapQuote {
  /** The round that this quote is based on. */
  round: number;
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
}
/** An object containing information about a successfully executed swap. */
export interface SwapExecution {
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
export declare function signSwapTransactions({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: PoolInfo;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
export declare const SWAP_PROCESS_TXN_COUNT = 4;
export declare function generateSwapTransactions({
  client,
  pool,
  swapType,
  assetIn,
  assetOut,
  slippage,
  initiatorAddr,
  poolAddress
}: {
  client: any;
  pool: PoolInfo;
  poolAddress: string;
  swapType: SwapType;
  assetIn: {
    assetID: number;
    amount: number | bigint;
  };
  assetOut: {
    assetID: number;
    amount: number | bigint;
  };
  slippage: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]>;
/**
 *
 * @param type - Type of the swap
 * @param pool - Information for the pool.
 * @param reserves - Pool reserves.
 * @param asset.assetID - ID of the asset to be swapped
 * @param asset.amount - Amount of the asset to be swapped
 * @param decimals.assetIn - Decimals quantity for the input asset
 * @param decimals.assetOut - Decimals quantity for the output asset
 * @returns A promise for the Swap quote
 */
export declare function getSwapQuote(
  type: SwapType,
  pool: PoolInfo,
  reserves: PoolReserves,
  asset: {
    assetID: number;
    amount: number | bigint;
  },
  decimals: {
    assetIn: number;
    assetOut: number;
  }
): SwapQuote;
/**
 * Execute a swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.swapType Type of the swap.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The desired quantity of the input asset.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The quantity of the output asset.
 * @param params.slippage The maximum acceptable slippage rate.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
export declare function issueSwap({
  client,
  pool,
  swapType,
  txGroup,
  signedTxns,
  initiatorAddr
}: {
  client: Algodv2;
  pool: PoolInfo;
  swapType: SwapType;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
  initiatorAddr: string;
}): Promise<SwapExecution>;
