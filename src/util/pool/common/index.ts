import {Algodv2} from "algosdk";

import {SupportedNetwork} from "../../commonTypes";
import {convertFromBaseUnits} from "../../util";
import {V1PoolInfo, V2PoolInfo, PoolReserves, PoolStatus} from "../poolTypes";
import {getPoolInfo as getV1_1PoolInfo} from "../v1_1";
import {getPoolInfo as getV2PoolInfo} from "../v2";

/**
 * @param {bigint} totalLiquidity Total amount of issued liquidity within a pool
 * @param {bigint} ownedLiquidity Amount of liquidity tokens within an account
 * @returns Percentage of liquidity that the account holds
 */
export function getPoolShare(totalLiquidity: bigint, ownedLiquidity: bigint) {
  let share = Number(ownedLiquidity) / Number(totalLiquidity);

  if (!Number.isFinite(share)) {
    share = 0;
  }

  return share;
}

/**
 * Calculates the pair ratio for the pool reserves
 */
export function getPoolPairRatio(
  decimals: {
    asset1: undefined | number;
    asset2: undefined | number;
  },
  reserves: null | PoolReserves
): null | number {
  const isEmpty = isPoolEmpty(reserves);
  let pairRatio: null | number = null;

  if (
    reserves &&
    !isEmpty &&
    reserves.asset1 &&
    reserves.asset2 &&
    typeof decimals.asset2 === "number" &&
    typeof decimals.asset1 === "number"
  ) {
    pairRatio =
      convertFromBaseUnits(decimals.asset1, reserves.asset1) /
      convertFromBaseUnits(decimals.asset2, reserves.asset2);
  }

  return pairRatio;
}

/**
 * Checks if the pool is empty
 *
 * @param poolReserves - Pool reserves
 * @returns true if pool is empty, otherwise returns false
 */
export function isPoolEmpty(poolReserves: undefined | null | PoolReserves) {
  return Boolean(poolReserves && !(poolReserves.asset1 + poolReserves.asset2));
}

/**
 * @param pool - Pool info
 * @returns true if pool's status is NOT_CREATED, otherwise returns false
 */
export function isPoolNotCreated(pool: undefined | null | V1PoolInfo | V2PoolInfo) {
  return pool?.status === PoolStatus.NOT_CREATED;
}

/**
 * @param pool - Pool info
 * @returns true if pool's status is READY, otherwise returns false
 */
export function isPoolReady(pool: undefined | null | V1PoolInfo | V2PoolInfo) {
  return pool?.status === PoolStatus.READY;
}

/**
 * @returns {PoolInfo[]} - Pool info for the given asset pair for all contract versions
 */
export function getPoolsForPair(params: {
  client: Algodv2;
  network: SupportedNetwork;
  asset1ID: number;
  asset2ID: number;
}): Promise<[V1PoolInfo, V2PoolInfo]> {
  return Promise.all([getV1_1PoolInfo(params), getV2PoolInfo(params)]);
}
