import {AssetWithAmountAndDecimals} from "../../util/asset/assetModels";
import {convertFromBaseUnits, roundNumber} from "../../util/util";

function calculateSwapRate({
  assetIn,
  assetOut
}: {
  assetIn: AssetWithAmountAndDecimals;
  assetOut: AssetWithAmountAndDecimals;
}) {
  return (
    convertFromBaseUnits(assetOut.decimals, Number(assetOut.amount)) /
    convertFromBaseUnits(assetIn.decimals, Number(assetIn.amount))
  );
}

function calculatePriceImpact({
  inputSupply,
  outputSupply,
  assetIn,
  assetOut
}: {
  inputSupply: bigint;
  outputSupply: bigint;
  assetIn: AssetWithAmountAndDecimals;
  assetOut: AssetWithAmountAndDecimals;
}): number {
  const swapRate = calculateSwapRate({assetIn, assetOut});
  const poolPrice =
    convertFromBaseUnits(assetOut.decimals, Number(outputSupply)) /
    convertFromBaseUnits(assetIn.decimals, Number(inputSupply));

  return roundNumber({decimalPlaces: 5}, Math.abs(swapRate / poolPrice - 1));
}

export {calculateSwapRate, calculatePriceImpact};
