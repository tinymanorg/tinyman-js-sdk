import algosdk, {
  ALGORAND_MIN_TX_FEE,
  Algodv2,
  decodeAddress,
  encodeUint64
} from "algosdk";

import {V2PoolInfo} from "../../util/pool/poolTypes";
import {FOLKS_WRAPPER_APP_ID} from "../constants";
import {SignerTransaction, SupportedNetwork} from "../../util/commonTypes";
import {encodeString} from "../../util/util";
import {getValidatorAppID} from "../../validator";
import {CONTRACT_VERSION} from "../../contract/constants";
import {FolksLendingAssetInfo} from "../types";

export async function generateTxns({
  client,
  pool,
  poolTokenIn,
  initiatorAddr,
  asset1Out,
  asset2Out,
  lendingManagerId,
  network
}: {
  client: Algodv2;
  pool: Pick<V2PoolInfo, "account" | "poolTokenID">;
  poolTokenIn: number | bigint;
  initiatorAddr: string;
  asset1Out: Omit<FolksLendingAssetInfo, "amount">;
  asset2Out: Omit<FolksLendingAssetInfo, "amount">;
  lendingManagerId: number;
  network: SupportedNetwork;
}): Promise<SignerTransaction[]> {
  const wrapperAppAddress = algosdk.getApplicationAddress(FOLKS_WRAPPER_APP_ID[network]);

  const suggestedParams = await client.getTransactionParams().do();
  const poolAddress = pool.account.address();
  const poolTokenId = pool.poolTokenID;

  if (!poolTokenId) {
    throw new Error("Pool token asset ID is missing");
  }

  const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: wrapperAppAddress,
    assetIndex: poolTokenId,
    amount: poolTokenIn,
    suggestedParams
  });

  const appCallTxn1 = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: FOLKS_WRAPPER_APP_ID[network],
    appArgs: [
      encodeString("remove_liquidity"),
      decodeAddress(poolAddress).publicKey,
      encodeUint64(asset1Out.lendingAppId),
      encodeUint64(asset2Out.lendingAppId)
    ],
    accounts: [poolAddress],
    foreignAssets: [asset1Out.id, asset2Out.id, asset1Out.fAssetId, asset2Out.fAssetId],
    foreignApps: [asset1Out.lendingAppId, asset2Out.lendingAppId, lendingManagerId],
    suggestedParams
  });

  appCallTxn1.fee = 15 * ALGORAND_MIN_TX_FEE;

  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
  const appCallTxn2 = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: FOLKS_WRAPPER_APP_ID[network],
    appArgs: [encodeString("noop")],
    accounts: [poolAddress],
    foreignAssets: [poolTokenId, asset1Out.fAssetId, asset2Out.fAssetId],
    foreignApps: [validatorAppID],
    suggestedParams
  });

  const txnGroup = algosdk.assignGroupID([assetTransferTxn, appCallTxn1, appCallTxn2]);

  return txnGroup.map((txn) => {
    return {txn, signers: [initiatorAddr]};
  });
}
