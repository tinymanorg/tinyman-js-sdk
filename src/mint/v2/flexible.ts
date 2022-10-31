import algosdk, {ALGORAND_MIN_TX_FEE, encodeUint64} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {MINT_APP_CALL_ARGUMENTS, V2_MINT_INNER_TXN_COUNT} from "../constants";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SupportedNetwork} from "../../util/commonTypes";
import {PoolInfo, PoolReserves, PoolStatus} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {calculateSubsequentAddLiquidity} from "./util";
import {poolUtils} from "../../util/pool";
import {isAlgo} from "../../util/asset/assetUtils";
export * from "./common";

/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 */
export function getQuote({
  pool,
  reserves,
  asset1In,
  asset2In,
  slippage = 0.05
}: {
  pool: PoolInfo;
  reserves: PoolReserves;
  asset1In: number | bigint;
  asset2In: number | bigint;
  slippage?: number;
}) {
  if (reserves.issuedLiquidity === 0n) {
    throw new Error("Pool has no liquidity");
  }

  if (pool.status !== PoolStatus.READY) {
    throw new Error("Pool is not ready");
  }

  const {
    poolTokenAssetAmount,
    swapInAmount,
    swapOutAmount,
    swapPriceImpact,
    swapTotalFeeAmount
  } = calculateSubsequentAddLiquidity(reserves, pool.totalFeeShare!, asset1In, asset2In);

  const swapQuote = {
    amountIn: swapInAmount,
    amountOut: swapOutAmount,
    swapFees: swapTotalFeeAmount,
    priceImpact: swapPriceImpact
  };

  return {
    asset1ID: pool.asset1ID,
    asset2ID: pool.asset2ID,
    asset1In: BigInt(asset1In),
    asset2In: BigInt(asset2In),
    liquidityOut: poolTokenAssetAmount,
    liquidityID: pool.liquidityTokenID!,
    round: reserves.round,
    share: poolUtils.getPoolShare(
      reserves.issuedLiquidity + swapOutAmount,
      swapOutAmount
    ),
    slippage,
    swapQuote
  };
}

export async function generateTxns({
  client,
  pool,
  network,
  poolAddress,
  asset_1,
  asset_2,
  liquidityToken,
  initiatorAddr
}: {
  client: AlgodClient;
  pool: PoolInfo;
  network: SupportedNetwork;
  poolAddress: string;
  asset_1: {id: number; amount: number | bigint};
  asset_2: {id: number; amount: number | bigint};
  liquidityToken: {id: number; amount: number | bigint};
  initiatorAddr: string;
}) {
  const suggestedParams = await client.getTransactionParams().do();
  const isAlgoPool = isAlgo(asset_2.id);
  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: pool.asset1ID,
    amount: asset_1.amount,
    suggestedParams
  });
  const asset2InTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: asset_2.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        assetIndex: pool.asset2ID,
        amount: asset_2.amount,
        suggestedParams
      });
  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: getValidatorAppID(network, CONTRACT_VERSION.V2),
    appArgs: [
      ...MINT_APP_CALL_ARGUMENTS.v2.FLEXIBLE_MODE,
      encodeUint64(liquidityToken.amount)
    ],
    accounts: [poolAddress],
    foreignAssets: [liquidityToken.id],
    suggestedParams: {
      ...suggestedParams,
      // Add +1 to account for the fee of the outer txn
      fee: (V2_MINT_INNER_TXN_COUNT.FLEXIBLE_MODE + 1) * ALGORAND_MIN_TX_FEE
    }
  });

  return [
    {
      txn: validatorAppCallTxn,
      signers: [initiatorAddr]
    },
    {
      txn: asset1InTxn,
      signers: [initiatorAddr]
    },
    {
      txn: asset2InTxn,
      signers: [initiatorAddr]
    }
  ];
}
