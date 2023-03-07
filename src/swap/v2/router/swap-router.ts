import algosdk, {ALGORAND_MIN_TX_FEE, getApplicationAddress, Transaction} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {CONTRACT_VERSION} from "../../../contract/constants";
import {ALGO_ASSET_ID} from "../../../util/asset/assetConstants";
import {getAssetId, isAlgo} from "../../../util/asset/assetUtils";
import {SupportedNetwork} from "../../../util/commonTypes";
import {getValidatorAppID} from "../../../validator";
import {SwapType} from "../../constants";
import {
  FetchSwapRouteQuotesPayload,
  FetchSwapRouteQuotesResponse,
  GenerateSwapRouterTxnsParams
} from "../../types";
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

export async function generateSwapRouterAssetOptInTransaction({
  client,
  routerAppID,
  assetIDs,
  accountAddress
}: {
  client: AlgodClient;
  routerAppID: number;
  assetIDs: number[];
  accountAddress: string;
}): Promise<Transaction> {
  const suggestedParams = await client.getTransactionParams().do();
  // We need to create a NoOp transaction to opt-in to the assets
  const assetOptInTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: accountAddress,
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
  route
}: GenerateSwapRouterTxnsParams) {
  const suggestedParams = await client.getTransactionParams().do();

  const [assetInID, intermediaryAssetID, assetOutID] = [
    getAssetId(route[0].quote.amount_in.asset),
    getAssetId(route[0].quote.amount_out.asset),
    getAssetId(route[1].quote.amount_out.asset)
  ];
  const [assetInAmount, assetOutAmount] = [
    Number(getAssetInFromSwapRoute(route).amount),
    Number(getAssetOutFromSwapRoute(route).amount)
  ];
  const [pool1Address, pool2Address] = [route[0].pool.address, route[1].pool.address];

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
    routerAppID,
    assetIDs: [assetInID, intermediaryAssetID, assetOutID]
  });

  if (optInRequiredAssetIDs.length > 0) {
    const routerAppAssetOptInTxn = await generateSwapRouterAssetOptInTransaction({
      client,
      accountAddress: initiatorAddr,
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
  routerAppID,
  assetIDs
}: {
  client: AlgodClient;
  routerAppID: number;
  assetIDs: number[];
}) {
  const swapRouterAppAddress = getApplicationAddress(routerAppID);
  const accountInfo = await client.accountInformation(swapRouterAppAddress).do();
  const appOptedInAssetIDs = accountInfo.assets.map(
    (asset: {"asset-id": number}) => asset["asset-id"]
  );
  const requiredAssetIDs = assetIDs.filter(
    (assetID: number) =>
      assetID !== ALGO_ASSET_ID && !appOptedInAssetIDs.includes(assetID)
  );

  return requiredAssetIDs;
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
}): Promise<FetchSwapRouteQuotesResponse> {
  const payload: FetchSwapRouteQuotesPayload = {
    asset_in_id: String(assetInID),
    asset_out_id: String(assetOutID),
    swap_type: swapType,
    amount: String(amount)
  };

  try {
    const response = await fetch(
      `${TINYMAN_ANALYTICS_API_BASE_URLS[network].v1}/swap-router/quotes/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    return response.json();
    // TODO: Handle all errors properly
  } catch (error) {
    console.error(error);

    throw error;
  }
}
