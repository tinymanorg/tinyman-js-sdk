import algosdk, {ALGORAND_MIN_TX_FEE, encodeUint64} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {ADD_LIQUIDITY_APP_CALL_ARGUMENTS} from "../constants";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SupportedNetwork} from "../../util/commonTypes";
import {PoolStatus, V2PoolInfo} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {calculateSubsequentAddLiquidity} from "./util";
import {poolUtils} from "../../util/pool";
import {isAlgo, prepareAssetPairData} from "../../util/asset/assetUtils";
import {V2AddLiquidityInternalSwapQuote, V2FlexibleAddLiquidityQuote} from "./types";
import {V2_ADD_LIQUIDITY_INNER_TXN_COUNT} from "./constants";
export * from "./common";

/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.slippage The maximum slippage allowed for the swap.
 */
export function getQuote({
  pool,
  slippage = 0.05,
  asset1,
  asset2
}: {
  pool: V2PoolInfo;
  asset1: {
    amount: number | bigint;
    decimals: number;
  };
  asset2: {
    amount: number | bigint;
    decimals: number;
  };
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

  const reserves = {
    asset1: pool.asset1Reserves || 0n,
    asset2: pool.asset2Reserves || 0n,
    issuedLiquidity: pool.issuedPoolTokens || 0n
  };
  const {
    poolTokenAssetAmount,
    swapInAmount,
    swapOutAmount,
    swapPriceImpact,
    swapTotalFeeAmount
  } = calculateSubsequentAddLiquidity(
    reserves,
    pool.totalFeeShare!,
    asset1.amount,
    asset2.amount,
    {
      asset1: asset1.decimals,
      asset2: asset2.decimals
    }
  );

  const swapQuote: V2AddLiquidityInternalSwapQuote = {
    amountIn: swapInAmount,
    amountOut: swapOutAmount,
    swapFees: swapTotalFeeAmount,
    priceImpact: swapPriceImpact
  };
  const minPoolTokenAssetAmountWithSlippage =
    poolTokenAssetAmount - BigInt(Math.ceil(Number(poolTokenAssetAmount) * slippage));

  return {
    asset1ID: pool.asset1ID,
    asset2ID: pool.asset2ID,
    asset1In: BigInt(asset1.amount),
    asset2In: BigInt(asset2.amount),
    liquidityOut: poolTokenAssetAmount,
    liquidityID: pool.liquidityTokenID!,
    share: poolUtils.getPoolShare(
      pool.issuedPoolTokens || 0n + swapOutAmount,
      swapOutAmount
    ),
    slippage,
    swapQuote,
    minPoolTokenAssetAmountWithSlippage
  };
}

export async function generateTxns({
  client,
  network,
  poolAddress,
  asset_1,
  asset_2,
  liquidityToken,
  initiatorAddr,
  minPoolTokenAssetAmount
}: {
  client: AlgodClient;
  network: SupportedNetwork;
  poolAddress: string;
  asset_1: {id: number; amount: number | bigint};
  asset_2: {id: number; amount: number | bigint};
  // TODO: convert to liquidityTokenID
  liquidityToken: {id: number; amount: number | bigint};
  initiatorAddr: string;
  minPoolTokenAssetAmount: bigint;
}) {
  const suggestedParams = await client.getTransactionParams().do();
  const [asset1, asset2] = prepareAssetPairData(asset_1, asset_2);
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
    appArgs: [
      ...ADD_LIQUIDITY_APP_CALL_ARGUMENTS.v2.FLEXIBLE_MODE,
      encodeUint64(minPoolTokenAssetAmount)
    ],
    accounts: [poolAddress],
    foreignAssets: [liquidityToken.id],
    suggestedParams
  });

  // Add +1 to account for the fee of the outer txn
  validatorAppCallTxn.fee =
    (V2_ADD_LIQUIDITY_INNER_TXN_COUNT.FLEXIBLE_MODE + 1) * ALGORAND_MIN_TX_FEE;

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
