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
export declare const MINIMUM_LIQUIDITY = 1000;
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
/**
 * Create an pool for an asset pair if it does not already exist. The initiator will provide
 * funding to create the pool and pay for the creation transaction fees.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to create.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 * @param pool.asset1UnitName The unit name of the first asset in the pool.
 * @param pool.asset2UnitName The unit name of the second asset in the pool.
 * @param signedTxns Signed transactions
 * @param txnIDs Transaction IDs
 */
export declare function createPool(
  client: Algodv2,
  pool: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
    asset1UnitName: string;
    asset2UnitName: string;
  },
  signedTxns: Uint8Array[],
  txnIDs: string[]
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
export declare function getPoolAssets({
  client,
  address,
  validatorAppID
}: {
  client: any;
  address: string;
  validatorAppID: number;
}): Promise<{
  asset1ID: number;
  asset2ID: number;
  liquidityTokenID: number;
} | null>;
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
