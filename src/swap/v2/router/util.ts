import {SupportedNetwork} from "../../../util/commonTypes";
import {convertFromBaseUnits} from "../../../util/util";
import {SwapRouterResponse} from "../../types";
import {SWAP_ROUTER_APP_ID} from "./constants";

function getSwapRouteRate(
  route: Pick<
    SwapRouterResponse,
    "asset_in" | "asset_out" | "input_amount" | "output_amount"
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
  route: Pick<SwapRouterResponse, "asset_out" | "output_amount">
) {
  return {
    asset: route.asset_out,
    amount: BigInt(route.output_amount ?? 0)
  };
}

function getAssetInFromSwapRoute(
  route: Pick<SwapRouterResponse, "asset_in" | "input_amount">
) {
  return {
    asset: route.asset_in,
    amount: BigInt(route.input_amount ?? 0)
  };
}

function getAssetInAndOutFromSwapRoute(
  route: Pick<
    SwapRouterResponse,
    "asset_in" | "asset_out" | "input_amount" | "output_amount"
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
