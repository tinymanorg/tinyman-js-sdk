import algosdk, {Transaction} from "algosdk";
import {PoolInfo} from "./pool";
import {InitiatorSigner} from "./common-types";
/** An object containing information about a mint quote. */
export interface MintQuote {
  /** The round that this quote is based on. */
  round: number;
  /** The ID of the first input asset in this quote. */
  asset1ID: number;
  /** The quantity of the first input asset in this quote. */
  asset1In: bigint;
  /** The ID of the second input asset in this quote. */
  asset2ID: number;
  /** The quantity of the second input asset in this quote. */
  asset2In: bigint;
  /** The ID of the liquidity token output in this quote. */
  liquidityID: number;
  /** The amount of the liquidity token output in this quote. */
  liquidityOut: bigint;
  /** The share of the total liquidity in this quote. */
  share: number;
}
/** An object containing information about a successfully executed mint transaction. */
export interface MintExecution {
  /** The round that the mint occurred in. */
  round: number;
  /**
   * The total amount of transaction fees that were spent (in microAlgos) to execute the mint and,
   * if applicable, redeem transactions.
   */
  fees: number;
  /** The ID of the output liquidity token asset. */
  liquidityID: number;
  /** The quantity of the output liquidity token asset. */
  liquidityOut: bigint;
  excessAmount: {
    /** Excess amount for the current swap */
    excessAmountForMinting: bigint;
    /** Total excess amount accumulated for the pool asset */
    totalExcessAmount: bigint;
  };
  /** The ID of the transaction. */
  txnID: string;
  /** The group ID for the transaction group. */
  groupID: string;
}
/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 */
export declare function getMintLiquidityQuote({
  client,
  pool,
  asset1In,
  asset2In
}: {
  client: any;
  pool: PoolInfo;
  asset1In: number | bigint;
  asset2In: number | bigint;
}): Promise<MintQuote>;
export declare const MINT_PROCESS_TXN_COUNT = 5;
export declare function generateMintTxns({
  client,
  pool,
  asset1In,
  asset2In,
  liquidityOut,
  slippage,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  asset1In: number | bigint;
  asset2In: number | bigint;
  liquidityOut: number | bigint;
  slippage: number;
  initiatorAddr: string;
}): Promise<algosdk.Transaction[]>;
export declare function signMintTxns({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: PoolInfo;
  txGroup: Transaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
/**
 * Execute a mint operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.liquidityOut The quantity of liquidity tokens being withdrawn.
 * @param params.slippage The maximum acceptable slippage rate. Should be a number between 0 and 100
 *   and acts as a percentage of params.liquidityOut.
 * @param params.initiatorAddr The address of the account performing the mint operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function mintLiquidity({
  client,
  pool,
  txGroup,
  signedTxns,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  txGroup: Transaction[];
  signedTxns: Uint8Array[];
  initiatorAddr: string;
}): Promise<MintExecution>;
