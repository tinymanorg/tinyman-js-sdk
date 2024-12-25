import algosdk, {Algodv2, decodeAddress, encodeUint64} from "algosdk";

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

  // Make sure to sort the assets according to the fAssetIds
  const [asset1, asset2] = [asset1In, asset2In].sort((a, b) => b.fAssetId - a.fAssetId);

  const isAlgoPool = isAlgo(asset2.id);

  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: initiatorAddr,
    receiver: wrapperAppAddress,
    assetIndex: asset1.id,
    amount: asset1.amount,
    suggestedParams
  });

  const asset2InTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: initiatorAddr,
        receiver: wrapperAppAddress,
        amount: asset2.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: initiatorAddr,
        receiver: wrapperAppAddress,
        assetIndex: asset2.id,
        amount: asset2.amount,
        suggestedParams
      });

  const appCallTxn1 = algosdk.makeApplicationNoOpTxnFromObject({
    sender: initiatorAddr,
    appIndex: FOLKS_WRAPPER_APP_ID[network],
    appArgs: [
      encodeString("add_liquidity"),
      decodeAddress(poolAddress).publicKey,
      encodeUint64(asset1.lendingAppId),
      encodeUint64(asset2.lendingAppId)
    ],
    foreignAssets: [asset1.id, asset2.id, asset1.fAssetId, asset2.fAssetId],
    foreignApps: [asset1.lendingAppId, asset2.lendingAppId, lendingManagerId],
    accounts: [poolAddress],
    suggestedParams
  });

  appCallTxn1.fee =
    suggestedParams.minFee * BigInt(FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT + 1);

  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
  const appCallTxn2 = algosdk.makeApplicationNoOpTxnFromObject({
    sender: initiatorAddr,
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
    assetIDs: [asset1.id, asset2.id, asset1.fAssetId, asset2.fAssetId, poolTokenId]
  });

  if (optInRequiredAssetIds.length) {
    const wrapperAppAssetOptInTxns = [
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: initiatorAddr,
        receiver: wrapperAppAddress,
        amount: MINIMUM_BALANCE_REQUIRED_PER_ASSET * optInRequiredAssetIds.length,
        suggestedParams
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: initiatorAddr,
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
      BigInt(optInRequiredAssetIds.length + 1) * suggestedParams.minFee;

    txns.unshift(...wrapperAppAssetOptInTxns);
  }

  return algosdk.assignGroupID(txns).map((txn) => {
    return {txn, signers: [initiatorAddr]};
  });
}

export function getAddLiquidityTotalFee(
  minFee: bigint,
  wrapperAppOptInRequiredAssetIdCount?: number
): bigint {
  // 1 asset transfer txn, 1 payment/asset transfer txn, 1 app call txn and 1 app call txn with inner txns
  return (
    minFee * BigInt(4 + FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT) +
    (wrapperAppOptInRequiredAssetIdCount
      ? BigInt(wrapperAppOptInRequiredAssetIdCount + 1) * minFee +
        BigInt(wrapperAppOptInRequiredAssetIdCount * MINIMUM_BALANCE_REQUIRED_PER_ASSET)
      : 0n)
  );
}
