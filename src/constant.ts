import {AlgorandMobileApiAsset} from "./common-types";

export const MAX_SLIPPAGE_FRACTION_DIGITS = 6;

export const ALGO_ASSET_ID = 0;

export const ALGO_ASSET: AlgorandMobileApiAsset = {
  asset_id: ALGO_ASSET_ID,
  is_verified: true,
  name: "Algorand",
  unit_name: "ALGO",
  fraction_decimals: 6
};
