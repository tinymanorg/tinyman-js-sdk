import {Algodv2} from "algosdk";

import {CONTRACT_VERSION} from "../contract/constants";
import {TinymanAnalyticsApiAsset} from "../util/asset/assetModels";
import {InitiatorSigner, SignerTransaction, SupportedNetwork} from "../util/commonTypes";
import {PoolInfo, PoolReserves, V1PoolInfo, V2PoolInfo} from "../util/pool/poolTypes";
import {QuoteWithPool, SwapQuote, SwapType} from "./types";
import {SwapV1_1} from "./v1_1";
import {SwapV2} from "./v2";

/**
 * Gets quotes for swap from each pool passed as an argument,
 * and returns the best quote (with the highest rate).
 */
export function getQuote(params: {
  type: SwapType;
  pools: {info: PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): QuoteWithPool {
  if (params.type === SwapType.FixedInput) {
    return getFixedInputSwapQuote(params);
  }

  return getFixedOutputSwapQuote(params);
}

/**
 * Gets quotes for fixed input swap from each pool passed as an argument,
 * and returns the best quote (with the highest rate).
 */
export function getFixedInputSwapQuote({
  pools,
  assetIn,
  assetOut,
  amount
}: {
  pools: {info: PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): QuoteWithPool {
  const quotes = pools.map<QuoteWithPool>((pool) => {
    let quote: SwapQuote;
    const quoteGetterArgs = {
      pool: pool.info,
      assetIn: {amount, assetID: Number(assetIn.id)},
      decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
      reserves: pool.reserves
    };

    if (pool.info.contractVersion === CONTRACT_VERSION.V1_1) {
      quote = SwapV1_1.getFixedInputSwapQuote(quoteGetterArgs);
    } else {
      quote = SwapV2.getFixedInputSwapQuote(quoteGetterArgs);
    }

    return {pool, quote};
  });

  const quotesByDescendingRate = quotes.sort((a, b) => b.quote.rate - a.quote.rate);
  const bestQuote = quotesByDescendingRate[0];

  return bestQuote;
}

/**
 * Gets quotes for fixed output swap from each pool passed as an argument,
 * and returns the best quote (with the highest rate).
 */
export function getFixedOutputSwapQuote({
  pools,
  assetIn,
  assetOut,
  amount
}: {
  pools: {info: PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): QuoteWithPool {
  const quotes = pools.map<QuoteWithPool>((pool) => {
    let quote: SwapQuote;
    const quoteGetterArgs = {
      pool: pool.info,
      assetOut: {amount, assetID: Number(assetOut.id)},
      decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
      reserves: pool.reserves
    };

    if (pool.info.contractVersion === CONTRACT_VERSION.V1_1) {
      quote = SwapV1_1.getFixedOutputSwapQuote(quoteGetterArgs);
    } else {
      quote = SwapV2.getFixedOutputSwapQuote(quoteGetterArgs);
    }

    return {pool, quote};
  });

  const quotesByDescendingRate = quotes.sort((a, b) => b.quote.rate - a.quote.rate);
  const bestQuote = quotesByDescendingRate[0];

  return bestQuote;
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

interface ExecuteCommonParams {
  swapType: SwapType;
  client: Algodv2;
  pool: V2PoolInfo;
  network: SupportedNetwork;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
  assetIn: {assetID: number; amount: number | bigint};
}

export function execute(
  params: (
    | {contractVersion: typeof CONTRACT_VERSION.V1_1; initiatorAddr: string}
    | {contractVersion: typeof CONTRACT_VERSION.V2}
  ) &
    ExecuteCommonParams
) {
  if (params.contractVersion === CONTRACT_VERSION.V1_1) {
    return SwapV1_1.execute(params);
  }

  return SwapV2.execute(params);
}
