import {convertFromBaseUnits} from "../../../util/util";
import {SwapRoute, SwapRouterQuote} from "../../types";

export function getSwapFeesFromSwapRoute(route: SwapRouterQuote[]): number {
  return route.reduce((acc, quote) => acc + Number(quote.swap_fees.amount), 0);
}

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
