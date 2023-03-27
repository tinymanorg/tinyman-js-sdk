import {ALGORAND_MIN_TX_FEE} from "algosdk";

import {calculatePriceImpact} from "../../swap/common/utils";
import {PoolReserves} from "../../util/pool/poolTypes";
import {V2_LOCKED_POOL_TOKENS} from "../../util/pool/poolConstants";
import {
  V2AddLiquidityType,
  V2_ADD_LIQUIDITY_INNER_TXN_COUNT,
  V2_ADD_LIQUIDITY_TXN_COUNT
} from "./constants";
import {
  AssetWithAmountAndDecimals,
  AssetWithIdAndAmountAndDecimals
} from "../../util/asset/assetModels";
import {V2AddLiquidityInternalSwapQuote} from "./types";

export function calculateSubsequentAddLiquidity({
  reserves,
  totalFeeShare,
  asset1,
  asset2
}: {
  totalFeeShare: number | bigint;
  reserves: Omit<PoolReserves, "round">;
  asset1: AssetWithIdAndAmountAndDecimals;
  asset2: AssetWithIdAndAmountAndDecimals;
}): {
  /** Amount of the pool tokens that will be out with the operation */
  poolTokenOutAmount: bigint;
  /**
   * Data about the internal swap, which will be made by the contract,
   * in case the given asset values doesn't satisfy the pool ratio.
   */
  internalSwapQuote: V2AddLiquidityInternalSwapQuote;
} {
  const oldK = reserves.asset1 * reserves.asset2;
  const newAsset1Reserves = reserves.asset1 + BigInt(asset1.amount);
  const newAsset2Reserves = reserves.asset2 + BigInt(asset2.amount);
  const newK = newAsset1Reserves * newAsset2Reserves;
  const newIssuedPoolTokenAmount = BigInt(
    parseInt(
      String(
        Math.sqrt(
          Number((newK * reserves.issuedLiquidity * reserves.issuedLiquidity) / oldK)
        )
      )
    )
  );

  let poolTokenAmount = newIssuedPoolTokenAmount - reserves.issuedLiquidity;

  const calculatedAsset1Amount =
    (poolTokenAmount * newAsset1Reserves) / newIssuedPoolTokenAmount;
  const calculatedAsset2Amount =
    (poolTokenAmount * newAsset2Reserves) / newIssuedPoolTokenAmount;

  const asset1SwapAmount = BigInt(asset1.amount) - calculatedAsset1Amount;
  const asset2SwapAmount = BigInt(asset2.amount) - calculatedAsset2Amount;

  let swapAssetIn: AssetWithIdAndAmountAndDecimals & {reserves: bigint};
  let swapAssetOut: AssetWithIdAndAmountAndDecimals & {reserves: bigint};
  let swapFee: bigint;

  if (asset1SwapAmount > asset2SwapAmount) {
    // Swap will be from Asset 1 to Asset 2

    const swapInAmountWithoutFee = asset1SwapAmount;

    swapFee = calculateInternalSwapFeeAmount(swapInAmountWithoutFee, totalFeeShare);

    swapAssetIn = {
      id: asset1.id,
      amount: swapInAmountWithoutFee + swapFee,
      decimals: asset1.decimals,
      reserves: reserves.asset1
    };
    swapAssetOut = {
      id: asset2.id,
      amount: BigInt(Math.abs(Math.min(Number(asset2SwapAmount), 0))),
      decimals: asset2.decimals,
      reserves: reserves.asset2
    };

    const feeAsPoolTokens =
      (swapFee * newIssuedPoolTokenAmount) / (newAsset1Reserves * BigInt(2));

    poolTokenAmount -= feeAsPoolTokens;
  } else {
    // Swap will be from Asset 2 to Asset 1

    const swapInAmountWithoutFee = asset2SwapAmount;

    swapFee = calculateInternalSwapFeeAmount(swapInAmountWithoutFee, totalFeeShare);
    swapAssetIn = {
      id: asset2.id,
      amount: swapInAmountWithoutFee + swapFee,
      decimals: asset2.decimals,
      reserves: reserves.asset2
    };
    swapAssetOut = {
      id: asset1.id,
      amount: BigInt(Math.abs(Math.min(Number(asset1SwapAmount), 0))),
      decimals: asset1.decimals,
      reserves: reserves.asset1
    };

    const feeAsPoolTokens =
      (swapFee * newIssuedPoolTokenAmount) / (newAsset2Reserves * BigInt(2));

    poolTokenAmount -= feeAsPoolTokens;
  }

  const swapPriceImpact = calculatePriceImpact({
    inputSupply: swapAssetIn.reserves,
    outputSupply: swapAssetOut.reserves,
    assetIn: swapAssetIn,
    assetOut: swapAssetOut
  });

  return {
    poolTokenOutAmount: poolTokenAmount,
    internalSwapQuote: {
      assetIn: swapAssetIn,
      assetOut: swapAssetOut,
      swapFees: swapFee,
      priceImpact: swapPriceImpact
    }
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
