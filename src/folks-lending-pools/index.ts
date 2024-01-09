import algosdk from "algosdk";

import {divScale, mulScale, parseState} from "./utils";
import {ONE_14_DP, ONE_16_DP, SECONDS_IN_YEAR} from "./constants";
import * as AddLiquidity from "./add-liquidity";
import * as RemoveLiquidity from "./remove-liquidity";
import {getFolksWrapperAppOptInRequiredAssetIDs} from "./add-liquidity/utils";
import {FolksLendingPool} from "./types";

function getLatestDepositInterestIndex(
  depositInterestIndex: bigint,
  depositInterestRate: bigint,
  lastUpdate?: number
) {
  const timestampDelta = BigInt(
    Math.floor(new Date().getTime() / 1000) - getLastTimestamp(lastUpdate)
  );

  return mulScale(
    depositInterestIndex,
    ONE_16_DP + (depositInterestRate * timestampDelta) / SECONDS_IN_YEAR,
    ONE_16_DP
  );
}

function getLastTimestamp(lastUpdate?: number): number {
  return lastUpdate ?? Math.floor(new Date().getTime() / 1000);
}

/**
 * Calculates the amount fAsset received when adding liquidity with original asset.
 */
function calculateDepositReturn(
  depositAmount: number,
  depositInterestIndex: bigint,
  depositInterestRate: bigint,
  lastUpdate?: number
) {
  const latestDepositInterestIndex = getLatestDepositInterestIndex(
    depositInterestIndex,
    depositInterestRate,
    lastUpdate
  );

  return divScale(BigInt(depositAmount), latestDepositInterestIndex, ONE_14_DP);
}

/**
 * Calculates the amount original asset received when removing liquidity from fAsset pool.
 */
function calculateWithdrawReturn(
  withdrawAmount: number,
  depositInterestIndex: bigint,
  depositInterestRate: bigint,
  lastUpdate?: number
) {
  const latestDepositInterestIndex = getLatestDepositInterestIndex(
    depositInterestIndex,
    depositInterestRate,
    lastUpdate
  );

  return mulScale(BigInt(withdrawAmount), latestDepositInterestIndex, ONE_14_DP);
}

/**
 * Fetches Folks lending pool application info from the algod, parses the global state and builds FolksLendingPool object.
 */
export async function fetchFolksLendingPool(
  algod: algosdk.Algodv2,
  appId: number
): Promise<FolksLendingPool> {
  const appInfo = await algod.getApplicationByID(appId).do();
  const rawState = appInfo.params["global-state"];
  const state = parseState(rawState);

  const managerAppId = Number(Buffer.from(state.pm, "base64").readBigUInt64BE(0));

  const interestInfo = Buffer.from(state.i, "base64");
  const depositInterestRate = interestInfo.readBigUInt64BE(32);
  const depositInterestIndex = interestInfo.readBigUInt64BE(40);
  const lastUpdate = Number(interestInfo.readBigUInt64BE(48));

  return {
    appId,
    managerAppId,
    depositInterestRate,
    depositInterestIndex,
    lastUpdate
  };
}

export const LendingPool = {
  AddLiquidity: {...AddLiquidity, calculateDepositReturn},
  RemoveLiquidity: {...RemoveLiquidity, calculateWithdrawReturn},
  getFolksWrapperAppOptInRequiredAssetIDs
};
