import algosdk, {ALGORAND_MIN_TX_FEE, getApplicationAddress} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {CONTRACT_VERSION} from "../../../contract/constants";
import {tinymanContract_v2} from "../../../contract/v2/contract";
import {isAlgo} from "../../../util/asset/assetUtils";
import {SignerTransaction} from "../../../util/commonTypes";
import {getValidatorAppID} from "../../../validator";
import {SwapType} from "../../constants";
import {
  FetchSwapRouteQuotesPayload,
  FetchSwapRouteQuotesResponse,
  GenerateSwapRouterTxnsParams
} from "../../types";
import {
  V2SwapTxnGroupIndices,
  V2_SWAP_APP_CALL_ARG_ENCODED,
  V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED,
  V2_SWAP_ROUTER_APP_ARGS_ENCODED
} from "../constants";

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
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  // We need to create a NoOp transaction for each asset we want to opt-in to
  const assetOptInTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: accountAddress,
    appIndex: routerAppID,
    appArgs: [V2_SWAP_ROUTER_APP_ARGS_ENCODED.ASSET_OPT_IN],
    foreignAssets: assetIDs,
    suggestedParams
  });
  // The number of inner transactions is the number of assets we're opting in to
  const innerTransactionCount = assetIDs.length;

  // The fee for the transaction is the fee for the outer transaction (which is a NoOp)
  // multiplied by the number of inner transactions
  assetOptInTxn.fee = ALGORAND_MIN_TX_FEE * (innerTransactionCount + 1);

  const txGroup = algosdk.assignGroupID([assetOptInTxn]);

  return [{txn: txGroup[0], signers: [accountAddress]}];
}

export async function generateSwapRouterTxns({
  initiatorAddr,
  assetIn,
  assetOut,
  client,
  intermediaryAssetID,
  routerAppID,
  network,
  swapType
}: GenerateSwapRouterTxnsParams) {
  const suggestedParams = await client.getTransactionParams().do();

  const pool1LogicSig = tinymanContract_v2.generateLogicSigAccountForPool({
    asset1ID: assetIn.id,
    asset2ID: intermediaryAssetID,
    network
  });
  const pool1Address = pool1LogicSig.address();
  const pool2LogicSig = tinymanContract_v2.generateLogicSigAccountForPool({
    asset1ID: intermediaryAssetID,
    asset2ID: assetOut.id,
    network
  });
  const pool2Address = pool2LogicSig.address();

  const isAssetInAlgo = isAlgo(assetIn.id);

  const inputTxn = isAssetInAlgo
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: getApplicationAddress(routerAppID),
        amount: assetIn.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: getApplicationAddress(routerAppID),
        amount: assetIn.amount,
        assetIndex: assetIn.id,
        suggestedParams
      });

  const routerAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: routerAppID,
    appArgs: [
      V2_SWAP_APP_CALL_ARG_ENCODED,
      V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED[swapType],
      algosdk.encodeUint64(assetOut.amount)
    ],
    foreignApps: [getValidatorAppID(network, CONTRACT_VERSION.V2)],
    foreignAssets: [assetIn.id, intermediaryAssetID, assetOut.id],
    accounts: [pool1Address, pool2Address],
    suggestedParams
  });

  const innerTransactionCount = swapType === SwapType.FixedInput ? 7 : 8;

  routerAppCallTxn.fee = ALGORAND_MIN_TX_FEE * (innerTransactionCount + 1);

  const txGroup = algosdk.assignGroupID([inputTxn, routerAppCallTxn]);

  return [
    {
      txn: txGroup[V2SwapTxnGroupIndices.INPUT_TXN],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[V2SwapTxnGroupIndices.APP_CALL_TXN],
      signers: [initiatorAddr]
    }
  ];
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
    (assetID: number) => !appOptedInAssetIDs.includes(assetID)
  );

  return requiredAssetIDs;
}

export async function getSwapRoute({
  amount,
  assetInID,
  assetOutID,
  swapType
}: {
  assetInID: number;
  assetOutID: number;
  swapType: SwapType;
  amount: number | bigint;
}): Promise<FetchSwapRouteQuotesResponse> {
  const payload: FetchSwapRouteQuotesPayload = {
    asset_in_id: String(assetInID),
    asset_out_id: String(assetOutID),
    swap_type: swapType,
    amount: String(amount)
  };

  try {
    const response = await fetch(
      "https://testnet.analytics.tinyman.org/api/v1/swap-router/quotes/",
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
