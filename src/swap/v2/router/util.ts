import {SupportedNetwork} from "../../../util/commonTypes";
import {convertFromBaseUnits} from "../../../util/util";
import {SwapType} from "../../constants";
import {SwapRoute, SwapRouterResponse} from "../../types";
import {SWAP_ROUTER_APP_ID} from "./constants";

function getSwapRouteRate(route: SwapRouterResponse) {
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

function getAssetOutFromSwapRoute(route: SwapRouterResponse) {
  return {
    asset: route.asset_out,
    amount: BigInt(
      route.swap_type === SwapType.FixedOutput ? route.amount : route.output_amount ?? 0
    )
  };
}

function getAssetInFromSwapRoute(route: SwapRouterResponse) {
  return {
    asset: route.asset_in,
    amount: BigInt(
      route.swap_type === SwapType.FixedInput ? route.amount : route.output_amount ?? 0
    )
  };
}

function getAssetInAndOutFromSwapRoute(route: SwapRouterResponse) {
  return {
    assetIn: getAssetInFromSwapRoute(route),
    assetOut: getAssetOutFromSwapRoute(route)
  };
}

function getSwapRouteFromRouterResponse(routerResponse: SwapRouterResponse): SwapRoute[] {
  let swapRoute: {
    poolAddress: string;
    asset_in: number;
    asset_out: number;
  }[] = [];

  if (
    !routerResponse.asset_ids ||
    !routerResponse.pool_ids ||
    routerResponse.asset_ids.length - 1 !== routerResponse.pool_ids.length
  ) {
    return swapRoute;
  }

  for (let i = 0; i < routerResponse.pool_ids.length; i++) {
    swapRoute.push({
      poolAddress: routerResponse.pool_ids[i],
      asset_in: routerResponse.asset_ids[i],
      asset_out: routerResponse.asset_ids[i + 1]
    });
  }

  return swapRoute;
}

export {
  getAssetInAndOutFromSwapRoute,
  getAssetInFromSwapRoute,
  getAssetOutFromSwapRoute,
  getSwapRouteFromRouterResponse,
  getSwapRouterAppID,
  getSwapRouteRate
};
