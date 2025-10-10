import {SupportedNetwork} from "../../util/commonTypes";
import {convertFromBaseUnits} from "../../util/util";
import {SwapRouterResponse} from "../types";
import {SWAP_ROUTER_APP_ID} from "./constants";

function getSwapRouteRate(
  route: Pick<
    SwapRouterResponse,
    "input_asset" | "output_asset" | "input_amount" | "output_amount"
  >
) {
  const {assetIn, assetOut} = getAssetInAndOutFromSwapRoute(route);

  return (
    convertFromBaseUnits(assetOut.asset.decimals, Number(assetOut.amount)) /
    convertFromBaseUnits(assetIn.asset.decimals, Number(assetIn.amount))
  );
}

function getSwapRouterAppID(network: SupportedNetwork) {
  const id = SWAP_ROUTER_APP_ID[network];

  if (!id) {
    throw new Error(`Unknown network or network not supported: ${network}`);
  }

  return id;
}

function getAssetOutFromSwapRoute(
  route: Pick<SwapRouterResponse, "output_asset" | "output_amount">
) {
  return {
    asset: route.output_asset,
    amount: BigInt(route.output_amount ?? 0)
  };
}

function getAssetInFromSwapRoute(
  route: Pick<SwapRouterResponse, "input_asset" | "input_amount">
) {
  return {
    asset: route.input_asset,
    amount: BigInt(route.input_amount ?? 0)
  };
}

function getAssetInAndOutFromSwapRoute(
  route: Pick<
    SwapRouterResponse,
    "input_asset" | "output_asset" | "input_amount" | "output_amount"
  >
) {
  return {
    assetIn: getAssetInFromSwapRoute(route),
    assetOut: getAssetOutFromSwapRoute(route)
  };
}

export {
  getAssetInAndOutFromSwapRoute,
  getAssetInFromSwapRoute,
  getAssetOutFromSwapRoute,
  getSwapRouterAppID,
  getSwapRouteRate
};
