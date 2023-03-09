import {Algodv2} from "algosdk";

import {CONTRACT_VERSION} from "../contract/constants";
import {AssetWithIdAndAmount} from "../util/asset/assetModels";
import {InitiatorSigner, SignerTransaction, SupportedNetwork} from "../util/commonTypes";
import {V1PoolInfo} from "../util/pool/poolTypes";
import {
  GetSwapQuoteBySwapTypeParams,
  GenerateSwapTxnsParams,
  GetSwapQuoteParams,
  SwapQuote,
  SwapQuoteType
} from "./types";
import {SwapType} from "./constants";
import {SwapV1_1} from "./v1_1";
import {SwapV2} from "./v2";
import {V1_1_SWAP_TOTAL_FEE} from "./v1_1/constants";
import {getV2SwapTotalFee} from "./v2/util";
import {isPoolEmpty} from "../util/pool/common";
import {ContractVersionValue} from "../contract/types";
import {getSwapRouteRate} from "./v2/router/util";
import OutputAmountExceedsAvailableLiquidityError from "../util/error/OutputAmountExceedsAvailableLiquidityError";

/**
 * Gets the best quote for swap from the pools and swap router and returns the best option.
 */
export function getQuote(params: GetSwapQuoteParams): Promise<SwapQuote> {
  const {type, isSwapRouterEnabled, pools} = params;

  if (!isSwapRouterEnabled && pools.every((pool) => isPoolEmpty(pool.reserves))) {
    throw new Error("No pools available for swap");
  }

  if (type === SwapType.FixedInput) {
    return getFixedInputSwapQuote(params);
  } else if (type === SwapType.FixedOutput) {
    return getFixedOutputSwapQuote(params);
  }

  return Promise.reject(new Error("Invalid swap type"));
}

/**
 * Given a list of swap quotes, it filters out the invalid quotes.
 * Validity of the quote is checked by if the promise was successfully resolved
 * and an actual quote object is available on the response
 */
function validateQuotes(promises: Promise<SwapQuote>[]): Promise<SwapQuote[]> {
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
        (result) => result.status === "fulfilled" && result.value !== undefined
      ) as PromiseFulfilledResult<SwapQuote>[]
    ).map((result) => result.value);
  });
}

/**
 * Gets quotes for fixed input swap the pools and swap router,
 * and returns the best quote (with the highest rate).
 */
export async function getFixedInputSwapQuote(
  params: GetSwapQuoteBySwapTypeParams
): Promise<SwapQuote> {
  const {amount, assetIn, assetOut, pools, isSwapRouterEnabled} = params;

  const quotePromises = pools.map<Promise<SwapQuote>>((pool) => {
    return new Promise(async (resolve, reject) => {
      let quote: SwapQuote | undefined;

      const quoteGetterArgs = {
        pool: pool.info,
        assetIn: {amount, id: Number(assetIn.id)},
        decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
        reserves: pool.reserves,
        isSwapRouterEnabled,
        network: params.network
      };

      try {
        if (pool.info.contractVersion === CONTRACT_VERSION.V1_1) {
          quote = SwapV1_1.getFixedInputSwapQuote(quoteGetterArgs);
        } else {
          quote = await SwapV2.getFixedInputSwapQuote(quoteGetterArgs);
        }

        resolve(quote);
      } catch (error) {
        reject(error);
      }
    });
  });

  const validQuotes = await validateQuotes(quotePromises);

  return getBestQuote(validQuotes);
}

/**
 * Gets quotes for fixed output swap from the pools and swap router,
 * and returns the best quote (with the highest rate).
 */
export async function getFixedOutputSwapQuote(
  params: GetSwapQuoteBySwapTypeParams
): Promise<SwapQuote> {
  const {amount, assetIn, assetOut, pools, isSwapRouterEnabled} = params;

  const quotePromises = pools.map<Promise<SwapQuote>>((pool) => {
    return new Promise(async (resolve, reject) => {
      let quote: SwapQuote | undefined;
      const quoteGetterArgs = {
        pool: pool.info,
        assetOut: {amount, id: Number(assetOut.id)},
        decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
        reserves: pool.reserves,
        isSwapRouterEnabled,
        network: params.network
      };

      try {
        if (pool.info.contractVersion === CONTRACT_VERSION.V1_1) {
          quote = SwapV1_1.getFixedOutputSwapQuote(quoteGetterArgs);
        } else {
          quote = await SwapV2.getFixedOutputSwapQuote(quoteGetterArgs);
        }

        resolve(quote);
      } catch (error) {
        reject(error);
      }
    });
  });

  const validQuotes = await validateQuotes(quotePromises);

  return getBestQuote(validQuotes);
}

/**
 * @returns The asset amount ratio for the given quote
 */
function getSwapQuoteRate(quote: SwapQuote): number {
  if (quote.type === SwapQuoteType.Direct) {
    return quote.quoteWithPool.quote.rate;
  }

  return getSwapRouteRate(quote.route);
}

/**
 * Compares the given quotes and returns the best one (with the highest rate).
 */
function getBestQuote(quotes: SwapQuote[]): SwapQuote {
  let bestQuote: SwapQuote = quotes[0];
  let bestQuoteRate = getSwapQuoteRate(bestQuote);

  for (const quote of quotes) {
    const currentRate = getSwapQuoteRate(quote);

    if (currentRate > bestQuoteRate) {
      bestQuote = quote;
      bestQuoteRate = currentRate;
    }
  }

  return bestQuote;
}

export function generateTxns(
  params: GenerateSwapTxnsParams
): Promise<SignerTransaction[]> {
  if (
    params.quote.type === SwapQuoteType.Direct &&
    getContractVersionFromSwapQuote(params.quote) === CONTRACT_VERSION.V1_1
  ) {
    return SwapV1_1.generateTxns({...params, quote: params.quote.quoteWithPool});
  }

  return SwapV2.generateTxns(params);
}

export function signTxns(params: {
  quote: SwapQuote;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  if (
    params.quote.type === SwapQuoteType.Direct &&
    getContractVersionFromSwapQuote(params.quote) === CONTRACT_VERSION.V1_1
  ) {
    const {
      quoteWithPool: {pool}
    } = params.quote;

    return SwapV1_1.signTxns({pool, ...params});
  }

  return SwapV2.signTxns(params);
}

interface ExecuteCommonParams {
  swapType: SwapType;
  client: Algodv2;
  network: SupportedNetwork;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
  assetIn: AssetWithIdAndAmount;
}

export function execute(
  params: (
    | {
        contractVersion: typeof CONTRACT_VERSION.V1_1;
        initiatorAddr: string;
        pool: V1PoolInfo;
      }
    | {contractVersion: typeof CONTRACT_VERSION.V2; quote: SwapQuote}
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

export function getContractVersionFromSwapQuote(quote: SwapQuote): ContractVersionValue {
  if (quote.type === SwapQuoteType.Direct) {
    return quote.quoteWithPool.pool.contractVersion;
  }

  return CONTRACT_VERSION.V2;
}
