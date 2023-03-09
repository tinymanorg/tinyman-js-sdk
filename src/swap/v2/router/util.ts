import {SupportedNetwork} from "../../../util/commonTypes";
import {convertFromBaseUnits} from "../../../util/util";
import {SwapRoute} from "../../types";
import {SWAP_ROUTER_APP_ID} from "./constants";

function getSwapRouteRate(route: SwapRoute) {
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

  return SWAP_ROUTER_APP_ID[network];
}

function getAssetOutFromSwapRoute(route: SwapRoute) {
  return route[route.length - 1].quote.amount_out;
}

function getAssetInFromSwapRoute(route: SwapRoute) {
  return route[0].quote.amount_in;
}

function getAssetInAndOutFromSwapRoute(route: SwapRoute) {
  return {
    assetIn: getAssetInFromSwapRoute(route),
    assetOut: getAssetOutFromSwapRoute(route)
  };
}

export {
  getSwapRouteRate,
  getSwapRouterAppID,
  getAssetOutFromSwapRoute,
  getAssetInFromSwapRoute,
  getAssetInAndOutFromSwapRoute
};
