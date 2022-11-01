import {Algodv2} from "algosdk";

import {CONTRACT_VERSION} from "../contract/constants";
import {TinymanAnalyticsApiAsset} from "../util/asset/assetModels";
import {InitiatorSigner, SignerTransaction} from "../util/commonTypes";
import {PoolInfo, PoolReserves, V1PoolInfo, V2PoolInfo} from "../util/pool/poolTypes";
import {SwapQuote, SwapType} from "./types";
import {SwapV1_1} from "./v1_1";
import {SwapV2} from "./v2";

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

export function generateTxns(params: {
  client: Algodv2;
  pool: V1PoolInfo | V2PoolInfo;
  poolAddress: string;
  swapType: SwapType;
  assetIn: {assetID: number; amount: number | bigint};
  assetOut: {assetID: number; amount: number | bigint};
  slippage: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  if (params.pool.contractVersion === CONTRACT_VERSION.V1_1) {
    return SwapV1_1.generateTxns(params);
  }

  return SwapV2.generateTxns(params);
}

export function signTxns(params: {
  pool: V1PoolInfo;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  if (params.pool.contractVersion === CONTRACT_VERSION.V1_1) {
    return SwapV1_1.signTxns(params);
  }

  return SwapV2.signTxns(params);
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
export function getFixedInputSwapQuote(_params: {
  pools: {info: PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): {quote: SwapQuote; pool: {info: PoolInfo; reserves: PoolReserves}} {
  throw new Error("Not implemented");
}

/**
 * This util will generate quotes using both contract versions with
 * Swap[ContractVersion.V1_1].getFixedOutputQuote and Swap[ContractVersion.V2].getFixedOutputQuote.
 * Then, it will compare the price and return the quote that offers a better price for the operation.
 */
export function getFixedOutputSwapQuote(_params: {
  pools: {info: PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): SwapQuote {
  throw new Error("Not implemented");
}
