import {CONTRACT_VERSION} from "../contract/constants";
import {InitiatorSigner, SignerTransaction} from "../util/commonTypes";
import {V1PoolInfo} from "../util/pool/poolTypes";
import {
  GetSwapQuoteBySwapTypeParams,
  GenerateSwapTxnsParams,
  GetSwapQuoteParams,
  SwapQuote,
  SwapQuoteType,
  ExecuteSwapCommonParams
} from "./types";
import {SwapType} from "./constants";
import {SwapV1_1} from "./v1_1";
import {SwapV2} from "./v2";
import {
  getBestQuote,
  getSwapQuoteContractVersion,
  isSwapQuoteErrorCausedByAmount
} from "./common/utils";
import {getAssetId} from "../util/asset/assetUtils";
import SwapQuoteError, {SwapQuoteErrorType} from "../util/error/SwapQuoteError";

/**
 * Gets the best quote for swap from the pools and swap router and returns the best option.
 */
export function getQuote(params: GetSwapQuoteParams): Promise<SwapQuote> {
  const {type} = params;

  if (type === SwapType.FixedInput) {
    return getFixedInputSwapQuote(params);
  } else if (type === SwapType.FixedOutput) {
    return getFixedOutputSwapQuote(params);
  }

  throw new SwapQuoteError(SwapQuoteErrorType.InvalidSwapTypeError, "Invalid swap type");
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
        (result) => result.status === "fulfilled" && result.value
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
    quotePromises.push(
      new Promise((resolve, reject) => {
        try {
          resolve(
            SwapV1_1.getFixedInputSwapQuote({
              pool: v1_1Pool.info,
              assetIn: {amount, id: Number(assetIn.id)},
              decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
              reserves: v1_1Pool.reserves
            })
          );
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
      assetIn: {
        id: getAssetId(assetIn),
        decimals: assetIn.decimals
      },
      assetOut: {
        id: getAssetId(assetOut),
        decimals: assetOut.decimals
      },
      pool: v2Pool?.info ?? null,
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
    quotePromises.push(
      new Promise((resolve, reject) => {
        try {
          resolve(
            SwapV1_1.getFixedOutputSwapQuote({
              pool: v1_1Pool.info,
              assetOut: {amount, id: Number(assetOut.id)},
              decimals: {assetIn: assetIn.decimals, assetOut: assetOut.decimals},
              reserves: v1_1Pool.reserves
            })
          );
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
      assetIn: {
        id: getAssetId(assetIn),
        decimals: assetIn.decimals
      },
      assetOut: {
        id: getAssetId(assetOut),
        decimals: assetOut.decimals
      },
      pool: v2Pool?.info ?? null,
      isSwapRouterEnabled,
      network: params.network
    })
  );

  const validQuotes = await validateQuotes(quotePromises);

  return getBestQuote(validQuotes);
}

export function generateTxns(
  params: GenerateSwapTxnsParams
): Promise<SignerTransaction[]> {
  if (
    params.quote.type === SwapQuoteType.Direct &&
    getSwapQuoteContractVersion(params.quote) === CONTRACT_VERSION.V1_1
  ) {
    return SwapV1_1.generateTxns({...params, quoteAndPool: params.quote.data});
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

    return SwapV1_1.signTxns({...params, pool});
  }

  return SwapV2.signTxns(params);
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
    ExecuteSwapCommonParams
) {
  if (params.contractVersion === CONTRACT_VERSION.V1_1) {
    return SwapV1_1.execute(params);
  }

  return SwapV2.execute(params);
}
