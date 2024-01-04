import algosdk, {
  ALGORAND_MIN_TX_FEE,
  Algodv2,
  decodeAddress,
  encodeUint64
} from "algosdk";

import {SignerTransaction, SupportedNetwork} from "../../util/commonTypes";
import {isAlgo, prepareAssetPairData} from "../../util/asset/assetUtils";
import {
  FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT,
  FOLKS_WRAPPER_APP_ID
} from "../constants";
import {encodeString} from "../../util/util";
import {FolksLendingAssetInfo} from "../types";
import {CONTRACT_VERSION} from "../../contract/constants";
import {getValidatorAppID} from "../../validator";

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
  const [asset1, asset2] = prepareAssetPairData(asset1In, asset2In);
  const isAlgoPool = isAlgo(asset2.id);

  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: wrapperAppAddress,
    assetIndex: asset1.id,
    amount: asset1.amount,
    suggestedParams
  });

  const asset2InTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: wrapperAppAddress,
        amount: asset2.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: wrapperAppAddress,
        assetIndex: asset2.id,
        amount: asset2.amount,
        suggestedParams
      });

  const appCallTxn1 = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
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

  const txnGroup = algosdk.assignGroupID([
    asset1InTxn,
    asset2InTxn,
    appCallTxn1,
    appCallTxn2
  ]);

  return txnGroup.map((txn) => {
    return {txn, signers: [initiatorAddr]};
  });
}

export function getAddLiquidityTotalFee() {
  // 1 asset transfer txn, 1 payment/asset transfer txn, 1 app call txn and 1 app call txn with inner txns
  return ALGORAND_MIN_TX_FEE * (4 + FOLKS_LENDING_POOL_APP_CALL_INNER_TXN_COUNT);
}
