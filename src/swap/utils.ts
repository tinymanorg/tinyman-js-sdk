import {Algodv2} from "algosdk";

import {CONTRACT_VERSION} from "../contract/constants";
import {AssetWithIdAndAmount, TinymanAnalyticsApiAsset} from "../util/asset/assetModels";
import {InitiatorSigner, SignerTransaction, SupportedNetwork} from "../util/commonTypes";
import {PoolReserves, V1PoolInfo, V2PoolInfo} from "../util/pool/poolTypes";
import {SwapQuoteWithPool, SwapQuote} from "./types";
import {SwapType} from "./constants";
import {SwapV1_1} from "./v1_1";
import {SwapV2} from "./v2";
import {V1_1_SWAP_TOTAL_FEE} from "./v1_1/constants";
import {getV2SwapTotalFee} from "./v2/util";
import {isPoolEmpty} from "../util/pool/common";
import OutputAmountExceedsAvailableLiquidityError from "../util/error/OutputAmountExceedsAvailableLiquidityError";

/**
 * Gets quotes for swap from each pool passed as an argument,
 * and returns the best quote (with the highest rate).
 */
export function getQuote(params: {
  type: SwapType;
  pools: {info: V1PoolInfo | V2PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): Promise<SwapQuoteWithPool> {
  if (params.pools.every((pool) => isPoolEmpty(pool.reserves))) {
    throw new Error("No pools available for swap");
  }

  if (params.type === SwapType.FixedInput) {
    return getFixedInputSwapQuote(params);
  }

  return getFixedOutputSwapQuote(params);
}

function validateQuotes(promises: Promise<SwapQuoteWithPool>[]) {
  return Promise.allSettled(promises).then((results) => {
    if (
      results.every(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof OutputAmountExceedsAvailableLiquidityError
      )
    ) {
      throw new OutputAmountExceedsAvailableLiquidityError();
    }

    return (
      results.filter(
        (result) => result.status === "fulfilled" && result.value.quote !== undefined
      ) as PromiseFulfilledResult<SwapQuoteWithPool>[]
    ).map((result) => result.value);
  });
}

/**
 * Gets quotes for fixed input swap from each pool passed as an argument,
 * and returns the best quote (with the highest rate).
 */
export async function getFixedInputSwapQuote({
  pools,
  assetIn,
  assetOut,
  amount
}: {
  pools: {info: V1PoolInfo | V2PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): Promise<SwapQuoteWithPool> {
  const quotePromises = pools.map<Promise<SwapQuoteWithPool>>((pool) => {
    return new Promise((resolve, reject) => {
      let quote: SwapQuote | undefined;

      const quoteGetterArgs = {
        pool: pool.info,
        assetIn: {amount, id: Number(assetIn.id)},
        decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
        reserves: pool.reserves
      };

      try {
        if (pool.info.contractVersion === CONTRACT_VERSION.V1_1) {
          quote = SwapV1_1.getFixedInputSwapQuote(quoteGetterArgs);
        } else {
          quote = SwapV2.getFixedInputSwapQuote(quoteGetterArgs);
        }

        resolve({pool, quote});
      } catch (error) {
        reject(error);
      }
    });
  });

  const validQuotes = await validateQuotes(quotePromises);

  return getBestQuote(validQuotes);
}

/**
 * Gets quotes for fixed output swap from each pool passed as an argument,
 * and returns the best quote (with the highest rate).
 */
export async function getFixedOutputSwapQuote({
  pools,
  assetIn,
  assetOut,
  amount
}: {
  pools: {info: V1PoolInfo | V2PoolInfo; reserves: PoolReserves}[];
  assetIn: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  assetOut: Pick<TinymanAnalyticsApiAsset, "id" | "decimals">;
  amount: number | bigint;
}): Promise<SwapQuoteWithPool> {
  const quotePromises = pools.map<Promise<SwapQuoteWithPool>>((pool) => {
    return new Promise((resolve, reject) => {
      let quote: SwapQuote | undefined;

      const quoteGetterArgs = {
        pool: pool.info,
        assetOut: {amount, id: Number(assetOut.id)},
        decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
        reserves: pool.reserves
      };

      try {
        if (pool.info.contractVersion === CONTRACT_VERSION.V1_1) {
          quote = SwapV1_1.getFixedOutputSwapQuote(quoteGetterArgs);
        } else {
          quote = SwapV2.getFixedOutputSwapQuote(quoteGetterArgs);
        }

        resolve({pool, quote});
      } catch (error) {
        reject(error);
      }
    });
  });

  const validQuotes = await validateQuotes(quotePromises);

  return getBestQuote(validQuotes);
}

/**
 * Compares the given quotes and returns the best one (with the highest rate).
 */
function getBestQuote(quotes: SwapQuoteWithPool[]): SwapQuoteWithPool {
  const quotesByDescendingRate = quotes
    .filter((quote) => !isPoolEmpty(quote.pool.reserves))
    .sort((a, b) => b.quote.rate - a.quote.rate);

  return quotesByDescendingRate[0];
}

export function generateTxns(params: {
  client: Algodv2;
  pool: V1PoolInfo | V2PoolInfo;
  poolAddress: string;
  swapType: SwapType;
  assetIn: AssetWithIdAndAmount;
  assetOut: AssetWithIdAndAmount;
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
  assetIn: AssetWithIdAndAmount;
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

/**
 * @returns the total fee that will be paid by the user
 * for the swap transaction with given parameters
 */
export function getSwapTotalFee(
  params:
    | {
        version: typeof CONTRACT_VERSION.V1_1;
      }
    | {
        version: typeof CONTRACT_VERSION.V2;
        type: SwapType;
      }
) {
  switch (params.version) {
    case CONTRACT_VERSION.V1_1:
      return V1_1_SWAP_TOTAL_FEE;

    case CONTRACT_VERSION.V2:
      return getV2SwapTotalFee(params.type);

    default:
      throw new Error("Provided contract version was not valid.");
  }
}
