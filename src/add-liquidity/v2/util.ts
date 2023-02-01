import {ALGORAND_MIN_TX_FEE} from "algosdk";

import {calculatePriceImpact} from "../../swap/common/utils";
import {PoolReserves} from "../../util/pool/poolTypes";
import {V2_LOCKED_POOL_TOKENS} from "../../util/pool/poolConstants";
import {
  V2AddLiquidityType,
  V2_ADD_LIQUIDITY_INNER_TXN_COUNT,
  V2_ADD_LIQUIDITY_TXN_COUNT
} from "./constants";
import {AssetWithAmountAndDecimals} from "../../util/asset/assetModels";

export function calculateSubsequentAddLiquidity({
  reserves,
  totalFeeShare,
  asset1Amount,
  asset2Amount,
  decimals
}: {
  reserves: Omit<PoolReserves, "round">;
  totalFeeShare: number | bigint;
  asset1Amount: number | bigint;
  asset2Amount: number | bigint;
  decimals: {asset1: number; asset2: number};
}) {
  const oldK = reserves.asset1 * reserves.asset2;
  const newAsset1Reserves = reserves.asset1 + BigInt(asset1Amount);
  const newAsset2Reserves = reserves.asset2 + BigInt(asset2Amount);
  const newK = newAsset1Reserves * newAsset2Reserves;
  const newIssuedPoolTokens = BigInt(
    parseInt(
      String(
        Math.sqrt(
          Number((newK * reserves.issuedLiquidity * reserves.issuedLiquidity) / oldK)
        )
      )
    )
  );

  let poolTokenAssetAmount = newIssuedPoolTokens - reserves.issuedLiquidity;
  const calculatedAsset1Amount =
    (poolTokenAssetAmount * newAsset1Reserves) / newIssuedPoolTokens;
  const calculatedAsset2Amount =
    (poolTokenAssetAmount * newAsset2Reserves) / newIssuedPoolTokens;
  const asset1SwapAmount = BigInt(asset1Amount) - calculatedAsset1Amount;
  const asset2SwapAmount = BigInt(asset2Amount) - calculatedAsset2Amount;
  let swapFromAsset1ToAsset2;
  let swapInAmount: bigint;
  let swapOutAmount: bigint;
  let swapTotalFeeAmount: bigint;

  if (asset1SwapAmount > asset2SwapAmount) {
    const swapInAmountWithoutFee = asset1SwapAmount;

    swapOutAmount = BigInt(Math.abs(Math.min(Number(asset2SwapAmount), 0)));
    swapFromAsset1ToAsset2 = true;
    swapTotalFeeAmount = calculateInternalSwapFeeAmount(
      swapInAmountWithoutFee,
      totalFeeShare
    );
    const feeAsPoolTokens =
      (swapTotalFeeAmount * newIssuedPoolTokens) / (newAsset1Reserves * BigInt(2));

    swapInAmount = swapInAmountWithoutFee + swapTotalFeeAmount;

    poolTokenAssetAmount -= feeAsPoolTokens;
  } else {
    const swapInAmountWithoutFee = asset2SwapAmount;

    swapOutAmount = BigInt(Math.abs(Math.min(Number(asset1SwapAmount), 0)));
    swapFromAsset1ToAsset2 = false;
    swapTotalFeeAmount = calculateInternalSwapFeeAmount(
      swapInAmountWithoutFee,
      totalFeeShare
    );
    const feeAsPoolTokens =
      (swapTotalFeeAmount * newIssuedPoolTokens) / (newAsset2Reserves * BigInt(2));

    swapInAmount = swapInAmountWithoutFee + swapTotalFeeAmount;

    poolTokenAssetAmount -= feeAsPoolTokens;
  }

  const swapPriceImpact = calculatePriceImpact({
    inputSupply: swapFromAsset1ToAsset2 ? reserves.asset1 : reserves.asset2,
    outputSupply: swapFromAsset1ToAsset2 ? reserves.asset2 : reserves.asset1,
    assetIn: {amount: swapInAmount, decimals: decimals.asset1},
    assetOut: {amount: swapOutAmount, decimals: decimals.asset2}
  });

  return {
    poolTokenAssetAmount,
    swapFromAsset1ToAsset2,
    swapInAmount,
    swapOutAmount,
    swapTotalFeeAmount,
    swapPriceImpact
  };
}

/**
 * @returns the amount of pool tokens that should be issued for the initial add liquidity operation
 */
export function calculateV2InitialLiquidityAmount(
  asset1: AssetWithAmountAndDecimals,
  asset2: AssetWithAmountAndDecimals
): bigint {
  if (!asset1.amount || !asset2.amount) {
    throw new Error("Both assets are required for the initial add liquidity");
  }

  return BigInt(
    Math.floor(
      Math.abs(
        Math.sqrt(Number(asset1.amount) * Number(asset2.amount)) - V2_LOCKED_POOL_TOKENS
      )
    )
  );
}

function calculateInternalSwapFeeAmount(
  swapAmount: bigint,
  totalFeeShare: number | bigint
) {
  return (swapAmount * BigInt(totalFeeShare)) / (BigInt(10_000) - BigInt(totalFeeShare));
}

/**
 * @returns the fee that should be assigned to the app call transaction
 */
export function getV2AddLiquidityAppCallFee(mode: V2AddLiquidityType) {
  const innerTxnCount = V2_ADD_LIQUIDITY_INNER_TXN_COUNT[mode];

  // Add +1 to the inner transaction count to account for the app call transaction
  return (innerTxnCount + 1) * ALGORAND_MIN_TX_FEE;
}

/**
 * @returns the total fee for the add liquidity operation including all transaction (including inner transactions) fees
 */
export function getV2AddLiquidityTotalFee(mode: V2AddLiquidityType) {
  const totalTxnCount =
    V2_ADD_LIQUIDITY_INNER_TXN_COUNT[mode] + V2_ADD_LIQUIDITY_TXN_COUNT[mode];

  return totalTxnCount * ALGORAND_MIN_TX_FEE;
}
