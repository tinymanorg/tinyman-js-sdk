import {calculatePriceImpact} from "../../swap/common/utils";
import {V2_LOCKED_POOL_TOKENS} from "../../util/pool/poolConstants";
import {PoolReserves} from "../../util/pool/poolTypes";

export function calculateSubsequentAddLiquidity(
  reserves: Omit<PoolReserves, "round">,
  totalFeeShare: number | bigint,
  asset1Amount: number | bigint,
  asset2Amount: number | bigint,
  decimals: {
    asset1: number;
    asset2: number;
  }
) {
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

export function calculateInitialAddLiquidity(
  asset1Amount: number | bigint,
  asset2Amount: number | bigint
) {
  if (!asset1Amount || !asset2Amount) {
    throw new Error("Both assets are required for the initial add liquidity");
  }

  return BigInt(
    Math.sqrt(Number(asset1Amount) * Number(asset2Amount)) - V2_LOCKED_POOL_TOKENS
  );
}

function calculateInternalSwapFeeAmount(
  swapAmount: bigint,
  totalFeeShare: number | bigint
) {
  return (swapAmount * BigInt(totalFeeShare)) / (BigInt(10_000) - BigInt(totalFeeShare));
}