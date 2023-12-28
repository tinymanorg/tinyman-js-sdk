import algosdk, {
  ALGORAND_MIN_TX_FEE,
  Algodv2,
  decodeAddress,
  encodeUint64
} from "algosdk";

import {V2PoolInfo} from "../../util/pool/poolTypes";
import {FOLKS_WRAPPER_APP_ID} from "../constants";
import {SupportedNetwork} from "../../util/commonTypes";
import {encodeString} from "../../util/util";
import {getValidatorAppID} from "../../validator";
import {CONTRACT_VERSION} from "../../contract/constants";

export async function generateTxns({
  client,
  pool,
  poolTokenIn,
  initiatorAddr,
  lendingAsset1,
  lendingAsset2,
  lendingManagerId,
  network
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  poolTokenIn: number | bigint;
  initiatorAddr: string;
  minAsset1Amount: number | bigint;
  minAsset2Amount: number | bigint;
  lendingAsset1: {id: number; appId: number};
  lendingAsset2: {id: number; appId: number};
  lendingManagerId: number;
  slippage: number;
  network: SupportedNetwork;
}) {
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
      encodeUint64(lendingAsset1.appId),
      encodeUint64(lendingAsset2.appId)
    ],
    accounts: [poolAddress],
    foreignAssets: [pool.asset1ID, pool.asset2ID, lendingAsset1.id, lendingAsset2.id],
    foreignApps: [lendingAsset1.appId, lendingAsset2.appId, lendingManagerId],
    suggestedParams
  });

  appCallTxn1.fee = 15 * ALGORAND_MIN_TX_FEE;

  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
  const appCallTxn2 = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: FOLKS_WRAPPER_APP_ID[network],
    appArgs: [encodeString("noop")],
    accounts: [poolAddress],
    foreignAssets: [poolTokenId, lendingAsset1.id, lendingAsset2.id],
    foreignApps: [validatorAppID],
    suggestedParams
  });

  appCallTxn2.fee = ALGORAND_MIN_TX_FEE;

  return algosdk.assignGroupID([assetTransferTxn, appCallTxn1, appCallTxn2]);
}
