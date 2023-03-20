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
import {getSwapRouteRate} from "./v2/router/util";
import {getSwapQuoteContractVersion} from "./common/utils";
import {getAssetId} from "../util/asset/assetUtils";
import {isPoolEmpty} from "../util/pool/common";
import SwapQuoteError, {SwapQuoteErrorType} from "../util/error/SwapQuoteError";

/**
 * Gets the best quote for swap from the pools and swap router and returns the best option.
 */
export function getQuote(params: GetSwapQuoteParams): Promise<SwapQuote> {
  const {type, pools, isSwapRouterEnabled} = params;

  if (!isSwapRouterEnabled && pools.every((pool) => isPoolEmpty(pool.reserves))) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.NoAvailablePoolError,
      "There is not an available pool for this swap. However, you can enable swap router and try to perform this swap with multiple pools."
    );
  }

  if (type === SwapType.FixedInput) {
    return getFixedInputSwapQuote(params);
  } else if (type === SwapType.FixedOutput) {
    return getFixedOutputSwapQuote(params);
  }

  throw new SwapQuoteError(SwapQuoteErrorType.InvalidSwapTypeError, "Invalid swap type");
}

export function isSwapQuoteErrorCausedByAmount(error: Error): boolean {
  return (
    error instanceof SwapQuoteError &&
    [
      SwapQuoteErrorType.SwapRouterInsufficientReservesError,
      SwapQuoteErrorType.SwapRouterLowSwapAmountError,
      SwapQuoteErrorType.OutputAmountExceedsAvailableLiquidityError,
      SwapQuoteErrorType.LowSwapAmountError
    ].includes(error.type)
  );
}

/**
 * Given a list of swap quotes, it filters out the invalid quotes.
 * Validity of the quote is checked by if the promise was successfully resolved
 * and an actual quote object is available on the response
 */
function validateQuotes(promises: Promise<SwapQuote>[]): Promise<SwapQuote[]> {
  return Promise.allSettled(promises).then((results) => {
    if (results.every((result) => result.status === "rejected")) {
      const [v1_1PoolError, v2PoolError] = (results as PromiseRejectedResult[]).map(
        (result) => result.reason
      ) as SwapQuoteError[];

      if (
        isSwapQuoteErrorCausedByAmount(v1_1PoolError) &&
        !isSwapQuoteErrorCausedByAmount(v2PoolError)
      ) {
        throw v1_1PoolError;
      }

      throw v2PoolError;
    }

    const filteredResults = (
      results.filter(
        (result) => result.status === "fulfilled" && result.value !== undefined
      ) as PromiseFulfilledResult<SwapQuote>[]
    ).map((result) => result.value);

    return filteredResults;
  });
}

/**
 * Gets quotes for fixed input swap the pools and swap router,
 * and returns the best quote (with the highest rate).
 */
export async function getFixedInputSwapQuote(
  params: GetSwapQuoteBySwapTypeParams
): Promise<SwapQuote> {
  const {amount, assetIn, assetOut, isSwapRouterEnabled, pools} = params;

  const quotePromises: Promise<SwapQuote>[] = [];

  const v1_1Pool = pools.find(
    (pool) => pool.info.contractVersion === CONTRACT_VERSION.V1_1
  );

  if (v1_1Pool) {
    const quoteGetterArgs = {
      pool: v1_1Pool.info,
      assetIn: {amount, id: Number(assetIn.id)},
      decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
      reserves: v1_1Pool.reserves
    };

    quotePromises.push(
      new Promise((resolve, reject) => {
        try {
          resolve(SwapV1_1.getFixedInputSwapQuote(quoteGetterArgs));
        } catch (error) {
          reject(error);
        }
      })
    );
  } else {
    quotePromises.push(
      Promise.reject(
        new SwapQuoteError(
          SwapQuoteErrorType.NoAvailablePoolError,
          "Trying to swap from non-existent pool"
        )
      )
    );
  }

  const v2Pool = pools.find((pool) => pool.info.contractVersion === CONTRACT_VERSION.V2);

  quotePromises.push(
    SwapV2.getFixedInputSwapQuote({
      amount,
      assetInID: getAssetId(assetIn),
      assetOutID: getAssetId(assetOut),
      pool: v2Pool?.info ?? null,
      decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
      isSwapRouterEnabled,
      network: params.network
    })
  );

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

  const quotePromises: Promise<SwapQuote>[] = [];

  const v1_1Pool = pools.find(
    (pool) => pool.info.contractVersion === CONTRACT_VERSION.V1_1
  );

  if (v1_1Pool) {
    const quoteGetterArgs = {
      pool: v1_1Pool.info,
      assetOut: {amount, id: Number(assetOut.id)},
      decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
      reserves: v1_1Pool.reserves
    };

    quotePromises.push(
      new Promise((resolve, reject) => {
        try {
          resolve(SwapV1_1.getFixedOutputSwapQuote(quoteGetterArgs));
        } catch (error) {
          reject(error);
        }
      })
    );
  } else {
    quotePromises.push(
      Promise.reject(
        new SwapQuoteError(
          SwapQuoteErrorType.NoAvailablePoolError,
          "Trying to swap from non-existent pool"
        )
      )
    );
  }

  const v2Pool = pools.find((pool) => pool.info.contractVersion === CONTRACT_VERSION.V2);

  quotePromises.push(
    SwapV2.getFixedOutputSwapQuote({
      amount,
      assetInID: getAssetId(assetIn),
      assetOutID: getAssetId(assetOut),
      pool: v2Pool?.info ?? null,
      decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
      isSwapRouterEnabled,
      network: params.network
    })
  );

  const validQuotes = await validateQuotes(quotePromises);

  return getBestQuote(validQuotes);
}

/**
 * @returns The asset amount ratio for the given quote
 */
function getSwapQuoteRate(quote: SwapQuote): number {
  if (quote.type === SwapQuoteType.Direct) {
    return quote.data.quote.rate;
  }

  return getSwapRouteRate(quote.data.route);
}

/**
 * Compares the given quotes and returns the best one (with the highest rate).
 */
export function getBestQuote(quotes: SwapQuote[]): SwapQuote {
  let bestQuote: SwapQuote = quotes[0];
  let bestQuoteRate = getSwapQuoteRate(bestQuote);

  for (let index = 1; index < quotes.length; index++) {
    const quote = quotes[index];
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
    getSwapQuoteContractVersion(params.quote) === CONTRACT_VERSION.V1_1
  ) {
    return SwapV1_1.generateTxns({...params, quote: params.quote.data});
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
    getSwapQuoteContractVersion(params.quote) === CONTRACT_VERSION.V1_1
  ) {
    const {
      data: {pool}
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
