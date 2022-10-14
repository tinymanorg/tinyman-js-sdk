import { Algodv2 } from "algosdk";
import { ContractVersionValue } from "../../contract/types";
import { PoolInfo, PoolReserves } from "./poolTypes";
import { SupportedNetwork } from "../commonTypes";
/**
 * Look up information about an pool.
 *
 * @param params - The parameters for the pool information request.
 * @param {Algodv2} params.client An Algodv2 client.
 * @param {SupportedNetwork} params.network Network to use.
 * @param {ContractVersion} params.contractVersion Contract version to use.
 * @param {number} params.asset1ID The ID of the first asset in the pool pair.
 * @param {number} params.asset2ID The ID of the second asset in the pool pair.
 */
export declare function getPoolInfo(params: {
    client: Algodv2;
    network: SupportedNetwork;
    contractVersion: ContractVersionValue;
    asset1ID: number;
    asset2ID: number;
}): Promise<PoolInfo>;
export declare function getPoolReserves(client: Algodv2, pool: PoolInfo): Promise<PoolReserves>;
/**
 * @param {bigint} totalLiquidity Total amount of issued liquidity within a pool
 * @param {bigint} ownedLiquidity Amount of liquidity tokens within an account
 * @returns Percentage of liquidity that the account holds
 */
export declare function getPoolShare(totalLiquidity: bigint, ownedLiquidity: bigint): number;
interface PoolAssets {
    asset1ID: number;
    asset2ID: number;
    liquidityTokenID: number;
}
/**
 * Find out the ids of a pool's liquidity token and assets
 */
export declare function getPoolAssets({ client, address, network, contractVersion }: {
    client: Algodv2;
    address: string;
    network: SupportedNetwork;
    contractVersion: ContractVersionValue;
}, cache?: Record<string, PoolAssets>): Promise<PoolAssets | null>;
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
export declare function isPoolNotCreated(pool: undefined | null | PoolInfo): boolean;
/**
 * @param pool - Pool info
 * @returns true if pool's status is READY, otherwise returns false
 */
export declare function isPoolReady(pool: undefined | null | PoolInfo): boolean;
/**
 * @returns {PoolInfo[]} - Pool info for the given asset pair for all contract versions
 */
export declare function getPoolsForPair(params: {
    client: Algodv2;
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
}): Promise<PoolInfo[]>;
export {};
