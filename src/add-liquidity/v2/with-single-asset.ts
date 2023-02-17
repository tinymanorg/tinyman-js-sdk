import algosdk, {Algodv2, encodeUint64} from "algosdk";

import {ADD_LIQUIDITY_APP_CALL_ARGUMENTS} from "../constants";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SignerTransaction, SupportedNetwork} from "../../util/commonTypes";
import {PoolStatus, V2PoolInfo} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {isAlgo} from "../../util/asset/assetUtils";
import {calculateSubsequentAddLiquidity, getV2AddLiquidityAppCallFee} from "./util";
import {poolUtils} from "../../util/pool";
import {V2SingleAssetInAddLiquidityQuote} from "./types";
import {V2AddLiquidityType} from "./constants";
import {
  AssetWithIdAndAmount,
  AssetWithIdAndAmountAndDecimals
} from "../../util/asset/assetModels";
import {tinymanJSSDKConfig} from "../../config";
export * from "./common";

export function getQuote({
  pool,
  assetIn,
  slippage = 0.05,
  decimals
}: {
  pool: V2PoolInfo;
  assetIn: AssetWithIdAndAmount;
  decimals: {asset1: number; asset2: number};
  slippage?: number;
}): V2SingleAssetInAddLiquidityQuote {
  if (pool.issuedPoolTokens === 0n) {
    throw new Error("Pool has no liquidity");
  }

  if (pool.status !== PoolStatus.READY) {
    throw new Error("Pool is not ready");
  }

  if (!pool.poolTokenID) {
    throw new Error("Pool token ID is not available");
  }

  const isAsset1In = assetIn.id === pool.asset1ID;
  const isAsset2In = assetIn.id === pool.asset2ID;

  if (!isAsset1In && !isAsset2In) {
    throw new Error("Provided input asset id didn't match any asset of the pool");
  }

  const asset1: AssetWithIdAndAmountAndDecimals = {
    id: pool.asset1ID,
    amount: isAsset1In ? assetIn.amount : 0,
    decimals: decimals.asset1
  };
  const asset2: AssetWithIdAndAmountAndDecimals = {
    id: pool.asset2ID,
    amount: isAsset2In ? assetIn.amount : 0,
    decimals: decimals.asset2
  };
  const reserves = {
    asset1: pool.asset1Reserves || 0n,
    asset2: pool.asset2Reserves || 0n,
    issuedLiquidity: pool.issuedPoolTokens || 0n
  };
  const {poolTokenOutAmount: poolTokenAmount, internalSwapQuote} =
    calculateSubsequentAddLiquidity({
      reserves,
      totalFeeShare: pool.totalFeeShare || 0,
      asset1,
      asset2
    });
  const minPoolTokenAssetAmountWithSlippage =
    poolTokenAmount - BigInt(Math.ceil(Number(poolTokenAmount) * slippage));

  return {
    assetIn: {
      id: isAsset1In ? pool.asset1ID : pool.asset2ID,
      amount: BigInt(assetIn.amount)
    },
    poolTokenOut: {
      id: pool.poolTokenID,
      amount: poolTokenAmount
    },
    share: poolUtils.getPoolShare(
      reserves.issuedLiquidity + poolTokenAmount,
      poolTokenAmount
    ),
    slippage,
    internalSwapQuote,
    minPoolTokenAssetAmountWithSlippage
  };
}

export async function generateTxns({
  client,
  network,
  poolAddress,
  assetIn,
  poolTokenId,
  initiatorAddr,
  minPoolTokenAssetAmount
}: {
  client: Algodv2;
  network: SupportedNetwork;
  poolAddress: string;
  assetIn: AssetWithIdAndAmount;
  poolTokenId: number;
  initiatorAddr: string;
  minPoolTokenAssetAmount: bigint;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const isAlgoPool = isAlgo(assetIn.id);
  const assetInTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: assetIn.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        assetIndex: assetIn.id,
        amount: assetIn.amount,
        suggestedParams
      });
  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: getValidatorAppID(network, CONTRACT_VERSION.V2),
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(CONTRACT_VERSION.V2),
    appArgs: [
      ...ADD_LIQUIDITY_APP_CALL_ARGUMENTS.v2.SINGLE_ASSET_MODE,
      encodeUint64(minPoolTokenAssetAmount)
    ],
    accounts: [poolAddress],
    foreignAssets: [poolTokenId],
    suggestedParams
  });

  validatorAppCallTxn.fee = getV2AddLiquidityAppCallFee(V2AddLiquidityType.SINGLE);

  const txGroup = algosdk.assignGroupID([assetInTxn, validatorAppCallTxn]);

  return [
    {txn: txGroup[0], signers: [initiatorAddr]},
    {txn: txGroup[1], signers: [initiatorAddr]}
  ];
}
