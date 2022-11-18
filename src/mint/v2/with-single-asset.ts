import algosdk, {ALGORAND_MIN_TX_FEE, encodeUint64} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {MINT_APP_CALL_ARGUMENTS, V2_MINT_INNER_TXN_COUNT} from "../constants";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SupportedNetwork} from "../../util/commonTypes";
import {PoolStatus, V2PoolInfo} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {isAlgo} from "../../util/asset/assetUtils";
import {calculateSubsequentAddLiquidity} from "./util";
import {poolUtils} from "../../util/pool";
import {SingleMintQuote} from "../types";
export * from "./common";

export function getQuote({
  pool,
  assetIn,
  slippage = 0.05,
  decimals
}: {
  pool: V2PoolInfo;
  assetIn: {id: number; amount: number | bigint};
  decimals: {asset1: number; asset2: number};
  slippage?: number;
}): SingleMintQuote {
  if (pool.issuedPoolTokens === 0n) {
    throw new Error("Pool has no liquidity");
  }

  if (pool.status !== PoolStatus.READY) {
    throw new Error("Pool is not ready");
  }

  const isAsset1 = assetIn.id === pool.asset1ID;
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
    isAsset1 ? assetIn.amount : 0,
    isAsset1 ? 0 : assetIn.amount,
    decimals
  );

  const swapQuote = {
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
    assetIn: BigInt(assetIn.amount),
    liquidityOut: poolTokenAssetAmount,
    liquidityID: pool.liquidityTokenID!,
    share: poolUtils.getPoolShare(
      reserves.issuedLiquidity + swapOutAmount,
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
  assetIn,
  liquidityToken,
  initiatorAddr,
  minPoolTokenAssetAmount
}: {
  client: AlgodClient;
  network: SupportedNetwork;
  poolAddress: string;
  assetIn: {id: number; amount: number | bigint};
  liquidityToken: {id: number; amount: number | bigint};
  initiatorAddr: string;
  minPoolTokenAssetAmount: bigint;
}) {
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
    appArgs: [
      ...MINT_APP_CALL_ARGUMENTS.v2.SINGLE_ASSET_MODE,
      encodeUint64(minPoolTokenAssetAmount)
    ],
    accounts: [poolAddress],
    foreignAssets: [liquidityToken.id],
    suggestedParams
  });

  // Add +1 to account for the fee of the outer txn
  validatorAppCallTxn.fee =
    (V2_MINT_INNER_TXN_COUNT.SINGLE_ASSET_MODE + 1) * ALGORAND_MIN_TX_FEE;

  const txGroup = algosdk.assignGroupID([assetInTxn, validatorAppCallTxn]);

  return [
    {txn: txGroup[0], signers: [initiatorAddr]},
    {txn: txGroup[1], signers: [initiatorAddr]}
  ];
}
