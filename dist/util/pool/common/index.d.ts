import { Algodv2 } from "algosdk";
import { SupportedNetwork } from "../../commonTypes";
import { V1PoolInfo, V2PoolInfo, PoolReserves } from "../poolTypes";
/**
 * @param {bigint} totalLiquidity Total amount of issued liquidity within a pool
 * @param {bigint} ownedLiquidity Amount of liquidity tokens within an account
 * @returns Percentage of liquidity that the account holds
 */
export declare function getPoolShare(totalLiquidity: bigint, ownedLiquidity: bigint): number;
/**
 * Calculates the pair ratio for the pool reserves
 */
export declare function getPoolPairRatio(decimals: {
    asset1: undefined | number;
    asset2: undefined | number;
}, reserves: null | PoolReserves): null | number;
/**
 * Checks if the pool is empty
 *
 * @param poolReserves - Pool reserves
 * @returns true if pool is empty, otherwise returns false
 */
export declare function isPoolEmpty(poolReserves: undefined | null | PoolReserves): boolean;
/**
 * @param pool - Pool info
 * @returns true if pool's status is NOT_CREATED, otherwise returns false
 */
export declare function isPoolNotCreated(pool: undefined | null | V1PoolInfo | V2PoolInfo): boolean;
/**
 * @param pool - Pool info
 * @returns true if pool's status is READY, otherwise returns false
 */
export declare function isPoolReady(pool: undefined | null | V1PoolInfo | V2PoolInfo): boolean;
/**
 * @returns {PoolInfo[]} - Pool info for the given asset pair for all contract versions
 */
export declare function getPoolsForPair(params: {
    client: Algodv2;
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
}): Promise<[V1PoolInfo, V2PoolInfo]>;
