import algosdk, {
  ALGORAND_MIN_TX_FEE,
  Algodv2,
  decodeAddress,
  encodeUint64
} from "algosdk";

import {SignerTransaction, SupportedNetwork} from "../../util/commonTypes";
import {isAlgo} from "../../util/asset/assetUtils";
import {
  FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT,
  FOLKS_WRAPPER_APP_ID
} from "../constants";
import {encodeString} from "../../util/util";
import {FolksLendingAssetInfo} from "../types";
import {CONTRACT_VERSION} from "../../contract/constants";
import {getValidatorAppID} from "../../validator";
import {getFolksWrapperAppOptInRequiredAssetIDs} from "./utils";
import {MINIMUM_BALANCE_REQUIRED_PER_ASSET} from "../../util/constant";

export async function generateTxns({
  client,
  network,
  poolAddress,
  poolTokenId,
  lendingManagerId,
  asset1In,
  asset2In,
  initiatorAddr
}: {
  client: Algodv2;
  network: SupportedNetwork;
  poolAddress: string;
  poolTokenId: number;
  lendingManagerId: number;
  asset1In: FolksLendingAssetInfo;
  asset2In: FolksLendingAssetInfo;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const wrapperAppAddress = algosdk.getApplicationAddress(FOLKS_WRAPPER_APP_ID[network]);
  const suggestedParams = await client.getTransactionParams().do();
  const isAlgoPool = isAlgo(asset2In.id);

  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: wrapperAppAddress,
    assetIndex: asset1In.id,
    amount: asset1In.amount,
    suggestedParams
  });

  const asset2InTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: wrapperAppAddress,
        amount: asset2In.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: wrapperAppAddress,
        assetIndex: asset2In.id,
        amount: asset2In.amount,
        suggestedParams
      });

  const appCallTxn1 = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: FOLKS_WRAPPER_APP_ID[network],
    appArgs: [
      encodeString("add_liquidity"),
      decodeAddress(poolAddress).publicKey,
      encodeUint64(asset1In.lendingAppId),
      encodeUint64(asset2In.lendingAppId)
    ],
    foreignAssets: [asset1In.id, asset2In.id, asset1In.fAssetId, asset2In.fAssetId],
    foreignApps: [asset1In.lendingAppId, asset2In.lendingAppId, lendingManagerId],
    accounts: [poolAddress],
    suggestedParams
  });

  appCallTxn1.fee =
    ALGORAND_MIN_TX_FEE * (FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT + 1);

  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
  const appCallTxn2 = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: FOLKS_WRAPPER_APP_ID[network],
    appArgs: [encodeString("noop")],
    foreignAssets: [poolTokenId],
    foreignApps: [validatorAppID],
    accounts: [poolAddress],
    suggestedParams
  });

  let txns = [asset1InTxn, asset2InTxn, appCallTxn1, appCallTxn2];

  const optInRequiredAssetIds = await getFolksWrapperAppOptInRequiredAssetIDs({
    client,
    network,
    assetIDs: [
      asset1In.id,
      asset2In.id,
      asset1In.fAssetId,
      asset2In.fAssetId,
      poolTokenId
    ]
  });

  if (optInRequiredAssetIds.length) {
    const wrapperAppAssetOptInTxns = [
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: wrapperAppAddress,
        amount: MINIMUM_BALANCE_REQUIRED_PER_ASSET * optInRequiredAssetIds.length,
        suggestedParams
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        from: initiatorAddr,
        appIndex: FOLKS_WRAPPER_APP_ID[network],
        appArgs: [
          encodeString("asset_optin"),
          ...optInRequiredAssetIds.map((assetId) => encodeUint64(assetId))
        ],
        foreignAssets: [...optInRequiredAssetIds],
        suggestedParams
      })
    ];

    wrapperAppAssetOptInTxns[1].fee =
      (optInRequiredAssetIds.length + 1) * ALGORAND_MIN_TX_FEE;

    txns.unshift(...wrapperAppAssetOptInTxns);
  }

  return algosdk.assignGroupID(txns).map((txn) => {
    return {txn, signers: [initiatorAddr]};
  });
}

export function getAddLiquidityTotalFee(wrapperAppOptInRequiredAssetIdCount?: number) {
  // 1 asset transfer txn, 1 payment/asset transfer txn, 1 app call txn and 1 app call txn with inner txns
  return (
    ALGORAND_MIN_TX_FEE * (4 + FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT) +
    (wrapperAppOptInRequiredAssetIdCount
      ? (wrapperAppOptInRequiredAssetIdCount + 1) * ALGORAND_MIN_TX_FEE +
        wrapperAppOptInRequiredAssetIdCount * MINIMUM_BALANCE_REQUIRED_PER_ASSET
      : 0)
  );
}
