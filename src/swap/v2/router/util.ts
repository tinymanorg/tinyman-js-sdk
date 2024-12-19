import {encodeAddress} from "algosdk";
import {toByteArray} from "base64-js";

import {bytesToInt} from "../../../governance/util/utils";
import {EXECUTOR_FALLBACK_ADDRESS} from "../../../util/account/accountConstants";
import {SupportedNetwork} from "../../../util/commonTypes";
import {convertFromBaseUnits} from "../../../util/util";
import {SwapType} from "../../constants";
import {SwapRoute, SwapRouterResponse} from "../../types";
import {
  SWAP_ROUTER_APP_ID,
  SWAP_ROUTER_SWAP_APP_CALL_ARGS_LENGTH,
  V2SwapRouterAppCallArgsTxnType,
  V2SwapRouterSwapAppCallArgsIndices
} from "./constants";

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
      route.swap_type === SwapType.FixedOutput ? route.amount : route.output_amount
    )
  };
}

function getAssetInFromSwapRoute(route: SwapRouterResponse) {
  return {
    asset: route.asset_in,
    amount: BigInt(
      route.swap_type === SwapType.FixedInput ? route.amount : route.output_amount
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
  const outputAssetId = Number(routerResponse.asset_out.id);
  const swapAppCallArgs = routerResponse.transactions.find(
    (txn) =>
      txn.args &&
      Buffer.from(
        txn.args[V2SwapRouterSwapAppCallArgsIndices.TxnType],
        "base64"
      ).toString() === V2SwapRouterAppCallArgsTxnType.Swap
  )?.args;

  if (!swapAppCallArgs || !swapAppCallArgs.length) {
    return swapRoute;
  }

  const routeArg = toByteArray(
    swapAppCallArgs[V2SwapRouterSwapAppCallArgsIndices.Routes]
  );
  const poolsArg = toByteArray(swapAppCallArgs[V2SwapRouterSwapAppCallArgsIndices.Pools]);

  if (swapAppCallArgs.length === SWAP_ROUTER_SWAP_APP_CALL_ARGS_LENGTH) {
    for (
      let i = 0;
      i + 8 < routeArg.length && bytesToInt(routeArg.slice(i, i + 8)) !== outputAssetId;
      i = i + 8
    ) {
      const asset_in = bytesToInt(routeArg.slice(i, i + 8));
      const asset_out = bytesToInt(routeArg.slice(i + 8, i + 16));

      swapRoute.push({asset_in, asset_out, poolAddress: ""});
    }

    for (
      let i = 0;
      i + 32 < poolsArg.length &&
      encodeAddress(poolsArg.slice(i, i + 32)) !== EXECUTOR_FALLBACK_ADDRESS;
      i = i + 32
    ) {
      const poolAddressArg = poolsArg.slice(i, i + 32);
      const poolAddress = encodeAddress(poolAddressArg);

      if (swapRoute[i / 32]) {
        swapRoute[i / 32].poolAddress = poolAddress;
      }
    }
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
