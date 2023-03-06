import algosdk, {Algodv2, encodeUint64} from "algosdk";

import {ADD_LIQUIDITY_APP_CALL_ARGUMENTS} from "../constants";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SignerTransaction, SupportedNetwork} from "../../util/commonTypes";
import {PoolStatus, V2PoolInfo} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {calculateSubsequentAddLiquidity, getV2AddLiquidityAppCallFee} from "./util";
import {poolUtils} from "../../util/pool";
import {isAlgo, prepareAssetPairData} from "../../util/asset/assetUtils";
import {V2FlexibleAddLiquidityQuote} from "./types";
import {V2AddLiquidityType} from "./constants";
import {
  AssetWithAmountAndDecimals,
  AssetWithIdAndAmount
} from "../../util/asset/assetModels";
import {tinymanJSSDKConfig} from "../../config";
export * from "./common";

/**
 * @returns A quote for the given asset 1 and asset 2 values.
 * This does not execute any transactions.
 */
export function getQuote({
  pool,
  slippage = 0.05,
  asset1,
  asset2
}: {
  pool: V2PoolInfo;
  asset1: AssetWithAmountAndDecimals;
  asset2: AssetWithAmountAndDecimals;
  slippage?: number;
}): V2FlexibleAddLiquidityQuote {
  if (pool.issuedPoolTokens === 0n) {
    throw new Error(
      "Pool has no liquidity at the moment. To be able to do Flexible Swap, you should first add initial liquidity."
    );
  }

  if (pool.status !== PoolStatus.READY) {
    throw new Error("Pool is not ready");
  }

  if (!pool.poolTokenID) {
    throw new Error("Pool token ID is not available");
  }

  const reserves = {
    asset1: pool.asset1Reserves || 0n,
    asset2: pool.asset2Reserves || 0n,
    issuedLiquidity: pool.issuedPoolTokens || 0n
  };
  const {poolTokenOutAmount, internalSwapQuote} = calculateSubsequentAddLiquidity({
    reserves,
    totalFeeShare: pool.totalFeeShare!,
    asset1: {
      id: pool.asset1ID,
      amount: asset1.amount,
      decimals: asset1.decimals
    },
    asset2: {
      id: pool.asset2ID,
      amount: asset2.amount,
      decimals: asset2.decimals
    }
  });
  const minPoolTokenAssetAmountWithSlippage =
    poolTokenOutAmount - BigInt(Math.ceil(Number(poolTokenOutAmount) * slippage));

  return {
    asset1In: {
      id: pool.asset1ID,
      amount: BigInt(asset1.amount)
    },
    asset2In: {
      id: pool.asset2ID,
      amount: BigInt(asset2.amount)
    },
    poolTokenOut: {
      id: pool.poolTokenID,
      amount: poolTokenOutAmount
    },
    share: poolUtils.getPoolShare(
      reserves.issuedLiquidity + poolTokenOutAmount,
      poolTokenOutAmount
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
  asset1In,
  asset2In,
  poolTokenOut,
  initiatorAddr,
  minPoolTokenAssetAmount
}: {
  client: Algodv2;
  network: SupportedNetwork;
  poolAddress: string;
  asset1In: AssetWithIdAndAmount;
  asset2In: AssetWithIdAndAmount;
  poolTokenOut: AssetWithIdAndAmount;
  initiatorAddr: string;
  minPoolTokenAssetAmount: bigint;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const [asset1, asset2] = prepareAssetPairData(asset1In, asset2In);
  const isAlgoPool = isAlgo(asset2.id);
  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: asset1.id,
    amount: asset1.amount,
    suggestedParams
  });
  const asset2InTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: asset2.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        assetIndex: asset2.id,
        amount: asset2.amount,
        suggestedParams
      });
  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: getValidatorAppID(network, CONTRACT_VERSION.V2),
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(CONTRACT_VERSION.V2),
    appArgs: [
      ...ADD_LIQUIDITY_APP_CALL_ARGUMENTS.v2.FLEXIBLE_MODE,
      encodeUint64(minPoolTokenAssetAmount)
    ],
    accounts: [poolAddress],
    foreignAssets: [poolTokenOut.id],
    suggestedParams
  });

  validatorAppCallTxn.fee = getV2AddLiquidityAppCallFee(V2AddLiquidityType.FLEXIBLE);

  const txGroup = algosdk.assignGroupID([asset1InTxn, asset2InTxn, validatorAppCallTxn]);

  return [
    {
      txn: txGroup[0],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[1],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[2],
      signers: [initiatorAddr]
    }
  ];
}
