import algosdk, {
  Algodv2,
  ALGORAND_MIN_TX_FEE,
  getApplicationAddress,
  Transaction
} from "algosdk";

import {CONTRACT_VERSION} from "../../../contract/constants";
import {AccountInformation} from "../../../util/account/accountTypes";
import {ALGO_ASSET_ID} from "../../../util/asset/assetConstants";
import {getAssetId, isAlgo} from "../../../util/asset/assetUtils";
import {SupportedNetwork} from "../../../util/commonTypes";
import SwapQuoteError, {SwapQuoteErrorType} from "../../../util/error/SwapQuoteError";
import {applySlippageToAmount, hasTinymanApiErrorShape} from "../../../util/util";
import {getValidatorAppID} from "../../../validator";
import {SwapType} from "../../constants";
import {FetchSwapRouteQuotesPayload, SwapRouterResponse, SwapRoute} from "../../types";
import {
  V2_SWAP_APP_CALL_ARG_ENCODED,
  V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED,
  V2_SWAP_ROUTER_APP_ARGS_ENCODED
} from "../constants";
import {SWAP_ROUTER_INNER_TXN_COUNT, TINYMAN_ANALYTICS_API_BASE_URLS} from "./constants";
import {
  getAssetInFromSwapRoute,
  getAssetOutFromSwapRoute,
  getSwapRouterAppID
} from "./util";

/**
 * Generates txns that would opt in the Swap Router Application to the assets used in the swap router
 */
export async function generateSwapRouterAssetOptInTransaction({
  client,
  routerAppID,
  assetIDs,
  initiatorAddr
}: {
  client: Algodv2;
  routerAppID: number;
  assetIDs: number[];
  initiatorAddr: string;
}): Promise<Transaction> {
  const suggestedParams = await client.getTransactionParams().do();
  // We need to create a NoOp transaction to opt-in to the assets
  const assetOptInTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: routerAppID,
    appArgs: [V2_SWAP_ROUTER_APP_ARGS_ENCODED.ASSET_OPT_IN],
    foreignAssets: assetIDs,
    suggestedParams
  });
  // The number of inner transactions is the number of assets we're opting in to
  const innerTransactionCount = assetIDs.length;

  /**
   * The opt-in transaction fee should cover the total cost of inner transactions,
   * and the outer transaction (thus the +1)
   */
  assetOptInTxn.fee = ALGORAND_MIN_TX_FEE * (innerTransactionCount + 1);

  return assetOptInTxn;
}

export async function generateSwapRouterTxns({
  initiatorAddr,
  client,
  network,
  swapType,
  route,
  slippage
}: {
  client: Algodv2;
  initiatorAddr: string;
  swapType: SwapType;
  route: SwapRoute;
  network: SupportedNetwork;
  slippage: number;
}) {
  const suggestedParams = await client.getTransactionParams().do();

  const [assetInID, intermediaryAssetID, assetOutID] = [
    getAssetId(route[0].quote.amount_in.asset),
    getAssetId(route[0].quote.amount_out.asset),
    getAssetId(route[1].quote.amount_out.asset)
  ];
  const [assetInAmountFromRoute, assetOutAmountFromRoute] = [
    Number(getAssetInFromSwapRoute(route).amount),
    Number(getAssetOutFromSwapRoute(route).amount)
  ];
  const [pool1Address, pool2Address] = [route[0].pool.address, route[1].pool.address];

  const assetInAmount =
    swapType === SwapType.FixedInput
      ? assetInAmountFromRoute
      : applySlippageToAmount("positive", slippage, assetInAmountFromRoute);
  const assetOutAmount =
    swapType === SwapType.FixedOutput
      ? assetOutAmountFromRoute
      : applySlippageToAmount("negative", slippage, assetOutAmountFromRoute);

  const isAssetInAlgo = isAlgo(assetInID);

  const routerAppID = getSwapRouterAppID(network);

  const inputTxn = isAssetInAlgo
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: getApplicationAddress(routerAppID),
        amount: assetInAmount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: getApplicationAddress(routerAppID),
        amount: assetInAmount,
        assetIndex: assetInID,
        suggestedParams
      });

  const routerAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: routerAppID,
    appArgs: [
      V2_SWAP_APP_CALL_ARG_ENCODED,
      V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED[swapType],
      algosdk.encodeUint64(assetOutAmount)
    ],
    foreignApps: [getValidatorAppID(network, CONTRACT_VERSION.V2)],
    foreignAssets: [assetInID, intermediaryAssetID, assetOutID],
    accounts: [pool1Address, pool2Address],
    suggestedParams
  });

  routerAppCallTxn.fee =
    ALGORAND_MIN_TX_FEE * (SWAP_ROUTER_INNER_TXN_COUNT[swapType] + 1);

  const txnList = [inputTxn, routerAppCallTxn];

  const optInRequiredAssetIDs = await getSwapRouterAppOptInRequiredAssetIDs({
    client,
    network,
    assetIDs: [assetInID, intermediaryAssetID, assetOutID]
  });

  if (optInRequiredAssetIDs.length > 0) {
    const routerAppAssetOptInTxn = await generateSwapRouterAssetOptInTransaction({
      client,
      initiatorAddr,
      assetIDs: optInRequiredAssetIDs,
      routerAppID
    });

    txnList.unshift(routerAppAssetOptInTxn);
  }

  const txGroup = algosdk.assignGroupID(txnList);

  return txGroup.map((txn: Transaction) => ({
    txn,
    signers: [initiatorAddr]
  }));
}

export async function getSwapRouterAppOptInRequiredAssetIDs({
  client,
  network,
  assetIDs
}: {
  client: Algodv2;
  network: SupportedNetwork;
  assetIDs: number[];
}) {
  const swapRouterAppAddress = getApplicationAddress(getSwapRouterAppID(network));
  const accountInfo = (await client
    .accountInformation(swapRouterAppAddress)
    .do()) as AccountInformation;
  const appOptedInAssetIDs = accountInfo.assets.map((asset) => asset["asset-id"]);

  return assetIDs.filter(
    (assetID: number) =>
      assetID !== ALGO_ASSET_ID && !appOptedInAssetIDs.includes(assetID)
  );
}

export async function getSwapRoute({
  amount,
  assetInID,
  assetOutID,
  swapType,
  network
}: {
  assetInID: number;
  assetOutID: number;
  swapType: SwapType;
  amount: number | bigint;
  network: SupportedNetwork;
}): Promise<SwapRouterResponse> {
  const payload: FetchSwapRouteQuotesPayload = {
    asset_in_id: String(assetInID),
    asset_out_id: String(assetOutID),
    swap_type: swapType,
    amount: String(amount)
  };

  const response = await fetch(
    `${TINYMAN_ANALYTICS_API_BASE_URLS[network].v1}/swap-router/quotes/`,
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

  if ((serializedResponse as SwapRouterResponse).route.length < 2) {
    throw new SwapQuoteError(
      SwapQuoteErrorType.SwapRouterNoRouteError,
      "Swap router couldn't find a route for this swap."
    );
  }

  return serializedResponse;
}
