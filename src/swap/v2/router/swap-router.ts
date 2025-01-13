import algosdk, {Algodv2, SuggestedParams, Transaction} from "algosdk";
import {toByteArray} from "base64-js";

import {SupportedNetwork} from "../../../util/commonTypes";
import {TINYMAN_ANALYTICS_API_BASE_URLS} from "../../../util/constant";
import SwapQuoteError, {SwapQuoteErrorType} from "../../../util/error/SwapQuoteError";
import {hasTinymanApiErrorShape} from "../../../util/util";
import {SwapType} from "../../constants";
import {
  FetchSwapRouteQuotesPayload,
  SwapRouterResponse,
  SwapRouterTransactionRecipe
} from "../../types";

export async function generateSwapRouterTxns({
  initiatorAddr,
  client,
  route
}: {
  client: Algodv2;
  initiatorAddr: string;
  route: SwapRouterResponse;
}) {
  if (!route.transactions || !route.transaction_fee) {
    return [];
  }

  const suggestedParams = await client.getTransactionParams().do();

  const txns: Transaction[] = [];

  route.transactions.forEach((txnRecipe) => {
    txns.push(generateSwapRouterTxnFromRecipe(txnRecipe, suggestedParams, initiatorAddr));
  });

  txns[0].fee = Number(route.transaction_fee);
  const txGroup = algosdk.assignGroupID(txns);

  return txGroup.map((txn: Transaction) => ({
    txn,
    signers: [initiatorAddr]
  }));
}

export function generateSwapRouterTxnFromRecipe(
  recipe: SwapRouterTransactionRecipe,
  suggestedParams: SuggestedParams,
  userAddress: string
) {
  let txn: Transaction;

  switch (recipe.type) {
    case algosdk.TransactionType.pay: {
      txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: userAddress,
        to: recipe.receiver!,
        amount: recipe.amount,
        suggestedParams
      });
      txn.fee = 0;

      return txn;
    }

    case algosdk.TransactionType.axfer: {
      txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: userAddress,
        to: recipe.receiver!,
        amount: recipe.amount,
        assetIndex: recipe.asset_id,
        suggestedParams
      });
      txn.fee = 0;

      return txn;
    }

    case algosdk.TransactionType.appl: {
      const appArgs = recipe.args?.map(toByteArray);

      txn = algosdk.makeApplicationNoOpTxnFromObject({
        from: userAddress,
        appIndex: recipe.app_id,
        appArgs,
        accounts: recipe.accounts,
        foreignApps: recipe.apps,
        foreignAssets: recipe.assets,
        suggestedParams
      });
      txn.fee = 0;

      return txn;
    }

    default:
      throw new Error(`Unknown transaction type: ${recipe.type}`);
  }
}

export async function getSwapRoute({
  amount,
  assetInID,
  assetOutID,
  swapType,
  network,
  slippage
}: {
  assetInID: number;
  assetOutID: number;
  swapType: SwapType;
  amount: number | bigint;
  network: SupportedNetwork;
  slippage: number;
}): Promise<SwapRouterResponse> {
  const payload: FetchSwapRouteQuotesPayload = {
    asset_in_id: String(assetInID),
    asset_out_id: String(assetOutID),
    swap_type: swapType,
    input_amount: swapType === SwapType.FixedInput ? String(amount) : undefined,
    output_amount: swapType === SwapType.FixedOutput ? String(amount) : undefined,
    slippage
  };

  const response = await fetch(
    `${TINYMAN_ANALYTICS_API_BASE_URLS[network].v1}/swap-router/quotes-v2/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  ).catch(() => {
    throw new Error("Network error");
  });

  const serializedResponse = await response.json();

  if (!response.ok) {
    if (hasTinymanApiErrorShape(serializedResponse)) {
      throw new SwapQuoteError(
        serializedResponse.type as SwapQuoteErrorType,
        serializedResponse.fallback_message
      );
    } else {
      throw new SwapQuoteError(
        SwapQuoteErrorType.UnknownError,
        "There was an error while getting a quote from Swap Router"
      );
    }
  }

  if (!(serializedResponse as SwapRouterResponse).transactions?.length) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.SwapRouterNoRouteError,
      "Swap router couldn't find a route for this swap."
    );
  }

  if (
    Number((serializedResponse as SwapRouterResponse).asset_in.id) !== assetInID ||
    Number((serializedResponse as SwapRouterResponse).asset_out.id) !== assetOutID ||
    (serializedResponse as SwapRouterResponse).swap_type === SwapType.FixedInput
      ? amount !== Number((serializedResponse as SwapRouterResponse).input_amount)
      : amount !== Number((serializedResponse as SwapRouterResponse).output_amount)
  ) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.UnknownError,
      "Swap router quote doesn't match the requested swap. Please try again."
    );
  }

  return serializedResponse;
}
