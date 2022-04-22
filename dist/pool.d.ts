import {Algodv2} from "algosdk";
export declare enum PoolStatus {
  NOT_CREATED = "not created",
  BOOTSTRAP = "bootstrap",
  READY = "ready",
  ERROR = "error"
}
export interface PoolInfo {
  addr: string;
  program: Uint8Array;
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  liquidityTokenID?: number;
  status: PoolStatus;
}
export interface PoolReserves {
  round: number;
  asset1: bigint;
  asset2: bigint;
  issuedLiquidity: bigint;
}
export interface AccountExcess {
  excessAsset1: bigint;
  excessAsset2: bigint;
  excessLiquidityTokens: bigint;
}
/**
 * Look up information about an pool.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to look up.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 */
export declare function getPoolInfo(
  client: any,
  pool: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
  }
): Promise<PoolInfo>;
export declare function getPoolReserves(
  client: any,
  pool: PoolInfo
): Promise<PoolReserves>;
export declare function getAccountExcess({
  client,
  pool,
  accountAddr
}: {
  client: any;
  pool: PoolInfo;
  accountAddr: string;
}): Promise<AccountExcess>;
/**
 * @param {bigint} totalLiquidity Total amount of issued liquidity within a pool
 * @param {bigint} ownedLiquidity Amount of liquidity tokens within an account
 * @returns Percentage of liquidity that the account holds
 */
export declare function getPoolShare(
  totalLiquidity: bigint,
  ownedLiquidity: bigint
): number;
interface PoolAssets {
  asset1ID: number;
  asset2ID: number;
  liquidityTokenID: number;
}
/**
 * Find out the ids of a pool's liquidity token and assets
 */
export declare function getPoolAssets(
  {
    client,
    address,
    validatorAppID
  }: {
    client: Algodv2;
    address: string;
    validatorAppID: number;
  },
  cache?: Record<string, PoolAssets>
): Promise<PoolAssets | null>;
/**
 * Calculates the pair ratio for the pool reserves
 */
export declare function getPoolPairRatio(
  decimals: {
    asset1: undefined | number;
    asset2: undefined | number;
  },
  reserves: null | PoolReserves
): null | number;
/**
 * Checks if the pool is empty
 *
 * @param poolReserves - Pool reserves
 * @returns true if pool is empty, otherwise returns false
 */
export declare function isPoolEmpty(
  poolReserves: undefined | null | PoolReserves
): boolean;
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
export {};
