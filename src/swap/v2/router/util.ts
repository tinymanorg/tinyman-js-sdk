import {SupportedNetwork} from "../../../util/commonTypes";
import {convertFromBaseUnits} from "../../../util/util";
import {SwapRoute} from "../../types";
import {SWAP_ROUTER_APP_ID} from "./constants";

export function getSwapRouteRate(route: SwapRoute) {
  const [assetIn, assetOut] = [
    route[0].quote.amount_in,
    route[route.length - 1].quote.amount_out
  ];

  return (
    convertFromBaseUnits(assetOut.asset.decimals, Number(assetOut.amount)) /
    convertFromBaseUnits(assetIn.asset.decimals, Number(assetIn.amount))
  );
}

export function getSwapRouterAppID(network: SupportedNetwork) {
  const id = SWAP_ROUTER_APP_ID[network];

  if (!id) {
    throw new Error(`Unknown network or network not supported: ${network}`);
  }

  return SWAP_ROUTER_APP_ID[network];
}

export function getAssetOutFromSwapRoute(route: SwapRoute) {
  return route[route.length - 1].quote.amount_out;
}

export function getAssetInFromSwapRoute(route: SwapRoute) {
  return route[0].quote.amount_in;
}
