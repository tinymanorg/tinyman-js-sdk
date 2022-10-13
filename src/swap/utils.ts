import {TinymanAnalyticsApiAsset} from "../util/asset/assetModels";
import {PoolInfo, PoolReserves} from "../util/pool/poolTypes";
import {SwapQuote, SwapType} from "./types";

/**
 * This function will call getFixedInputSwapQuote or getFixedOutputSwapQuote internally depending on the SwapType.
 */
export function getQuote(params: {
  type: SwapType;
  pools: {info: PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): {quote: SwapQuote; pool: {info: PoolInfo; reserves: PoolReserves}} {
  console.log({params});
  throw new Error("Not implemented");
}

/**
 * When this function is called, we will assume they will already have a
 * proper Swap Quote and determined which pool they will be using.
 * Using the quote and the pool data, we will generate the txns.
 */
export function generateTxns() {
  throw new Error("Not implemented");
}

export function signTxns() {
  throw new Error("Not implemented");
}

export function execute() {
  throw new Error("Not implemented");
}

/**
 *
 * This util will generate quotes from each of the pools passed as an argument
 * (these pools have to have the correct asset pair for the swap — compare with assetIn and assetOut ids).
 * It will therefore use both contract versions with Swap[ContractVersion.V1_1].getFixedInputQuote and Swap[ContractVersion.V2].getFixedInputQuote.
 * Then, it will compare the price and return the quote that offers a better price for the operation.
 * It will return an object that has the quote and information about the pool that offers a better price.
 */
export function getFixedInputSwapQuote(params: {
  pools: {info: PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): {quote: SwapQuote; pool: {info: PoolInfo; reserves: PoolReserves}} {
  console.log({params});
  throw new Error("Not implemented");
}

/**
 * This util will generate quotes using both contract versions with
 * Swap[ContractVersion.V1_1].getFixedOutputQuote and Swap[ContractVersion.V2].getFixedOutputQuote.
 * Then, it will compare the price and return the quote that offers a better price for the operation.
 */
export function getFixedOutputSwapQuote(params: {
  pools: {info: PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): SwapQuote {
  console.log({params});
  throw new Error("Not implemented");
}
