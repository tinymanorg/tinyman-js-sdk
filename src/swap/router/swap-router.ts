import algosdk, {Algodv2, SuggestedParams, Transaction} from "algosdk";
import {toByteArray} from "base64-js";

import {tinymanJSSDKConfig} from "../../config";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SupportedNetwork} from "../../util/commonTypes";
import {TINYMAN_ANALYTICS_API_BASE_URLS} from "../../util/constant";
import SwapQuoteError, {SwapQuoteErrorType} from "../../util/error/SwapQuoteError";
import {hasTinymanApiErrorShape} from "../../util/util";
import {SwapType} from "../constants";
import {
  FetchSwapRouteQuotesPayload,
  SwapRouterResponse,
  SwapRouterTransactionRecipe
} from "../types";

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

  txns[0].fee = BigInt(route.transaction_fee);
  const txGroup = algosdk.assignGroupID(txns);

  return txGroup.map((txn: Transaction) => ({
    txn,
    signers: [initiatorAddr]
  }));
}

function generateSwapRouterTxnFromRecipe(
  txnRecipe: SwapRouterTransactionRecipe,
  suggestedParams: SuggestedParams,
  userAddress: string
) {
  let txn: Transaction;

  switch (txnRecipe.type) {
    case algosdk.TransactionType.pay: {
      txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: userAddress,
        receiver: txnRecipe.receiver,
        amount: txnRecipe.amount,
        suggestedParams
      });
      txn.fee = 0n;

      return txn;
    }

    case algosdk.TransactionType.axfer: {
      txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: userAddress,
        receiver: txnRecipe.receiver,
        amount: txnRecipe.amount,
        assetIndex: txnRecipe.asset_id,
        suggestedParams
      });
      txn.fee = 0n;

      return txn;
    }

    case algosdk.TransactionType.appl: {
      const appArgs = txnRecipe.args?.map(toByteArray);
      const isSwapAppCall =
        txnRecipe.args &&
        Buffer.from(txnRecipe.args[0], "base64").toString("utf8") === "swap";

      txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
        appIndex: txnRecipe.app_id,
        appArgs,
        accounts: txnRecipe.accounts,
        foreignApps: txnRecipe.apps,
        foreignAssets: txnRecipe.assets,
        suggestedParams,
        note: isSwapAppCall
          ? tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(CONTRACT_VERSION.V2)
          : undefined
      });
      txn.fee = 0n;

      return txn;
    }

    default:
      throw new Error(`Unknown transaction type: ${txnRecipe.type}`);
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
  slippage: string;
}): Promise<SwapRouterResponse> {
  const payload: FetchSwapRouteQuotesPayload = {
    input_asset_id: String(assetInID),
    output_asset_id: String(assetOutID),
    swap_type: swapType,
    input_amount: swapType === SwapType.FixedInput ? String(amount) : undefined,
    output_amount: swapType === SwapType.FixedOutput ? String(amount) : undefined,
    slippage
  };

  const response = await fetch(
    `${TINYMAN_ANALYTICS_API_BASE_URLS[network].v1}/swap-router/quotes-v3/`,
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
    Number((serializedResponse as SwapRouterResponse).input_asset.id) !== assetInID ||
    Number((serializedResponse as SwapRouterResponse).output_asset.id) !== assetOutID ||
    (serializedResponse as SwapRouterResponse).swap_type === SwapType.FixedInput
      ? BigInt(amount) !==
        BigInt((serializedResponse as SwapRouterResponse).input_amount ?? 0)
      : BigInt(amount) !==
        BigInt((serializedResponse as SwapRouterResponse).output_amount ?? 0)
  ) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.UnknownError,
      "Swap router quote doesn't match the requested swap. Please try again."
    );
  }

  return serializedResponse;
}
