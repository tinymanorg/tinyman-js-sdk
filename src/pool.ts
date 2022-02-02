import algosdk, {Algodv2} from "algosdk";
import {fromByteArray} from "base64-js";

import {
  decodeState,
  joinByteArrays,
  getMinBalanceForAccount,
  convertFromBaseUnits,
  encodeString
} from "./util";
import {doBootstrap} from "./bootstrap";
import {AccountInformation} from "./account/accountTypes";
import {tinymanContract} from "./contract/contract";

export enum PoolStatus {
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

export const MINIMUM_LIQUIDITY = 1000;

/**
 * Look up information about an pool.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to look up.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 */
export async function getPoolInfo(
  client: any,
  pool: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
  }
): Promise<PoolInfo> {
  const poolLogicSig = tinymanContract.getPoolLogicSig(pool);

  let result: PoolInfo = {
    addr: poolLogicSig.addr,
    program: poolLogicSig.program,
    validatorAppID: pool.validatorAppID,
    asset1ID: Math.max(pool.asset1ID, pool.asset2ID),
    asset2ID: Math.min(pool.asset1ID, pool.asset2ID),
    status: PoolStatus.NOT_CREATED
  };

  const readyPoolAssets = await getPoolAssets({
    client,
    address: poolLogicSig.addr,
    validatorAppID: pool.validatorAppID
  });

  if (readyPoolAssets) {
    result.asset1ID = readyPoolAssets.asset1ID;
    result.asset2ID = readyPoolAssets.asset2ID;
    result.liquidityTokenID = readyPoolAssets.liquidityTokenID;
    result.status = PoolStatus.READY;
  }

  return result;
}

/**
 * Create an pool for an asset pair if it does not already exist. The initiator will provide
 * funding to create the pool and pay for the creation transaction fees.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to create.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 * @param signedTxns Signed transactions
 * @param txnIDs Transaction IDs
 */
export async function createPool(
  client: Algodv2,
  pool: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
  },
  signedTxns: Uint8Array[],
  txnIDs: string[]
): Promise<PoolInfo> {
  await doBootstrap({
    client,
    signedTxns,
    txnIDs
  });

  return getPoolInfo(client, pool);
}

const OUTSTANDING_ENCODED = encodeString("o");
const TOTAL_LIQUIDITY = 0xffffffffffffffffn;

/* eslint-disable complexity */
export async function getPoolReserves(
  client: any,
  pool: PoolInfo
): Promise<PoolReserves> {
  const info = (await client
    .accountInformation(pool.addr)
    .setIntDecoding("bigint")
    .do()) as AccountInformation;
  const appsLocalState = info["apps-local-state"] || [];

  let outstandingAsset1 = 0n;
  let outstandingAsset2 = 0n;
  let outstandingLiquidityTokens = 0n;

  for (const app of appsLocalState) {
    // eslint-disable-next-line eqeqeq
    if (app.id != pool.validatorAppID) {
      continue;
    }
    const keyValue = app["key-value"];

    if (!keyValue) {
      break;
    }

    const state = decodeState(keyValue);

    const outstandingAsset1Key = fromByteArray(
      joinByteArrays([OUTSTANDING_ENCODED, algosdk.encodeUint64(pool.asset1ID)])
    );
    const outstandingAsset2Key = fromByteArray(
      joinByteArrays([OUTSTANDING_ENCODED, algosdk.encodeUint64(pool.asset2ID)])
    );
    const outstandingLiquidityTokenKey = fromByteArray(
      joinByteArrays([OUTSTANDING_ENCODED, algosdk.encodeUint64(pool.liquidityTokenID!)])
    );

    const outstandingAsset1Value = state[outstandingAsset1Key];
    const outstandingAsset2Value = state[outstandingAsset2Key];
    const outstandingLiquidityTokenValue = state[outstandingLiquidityTokenKey];

    if (typeof outstandingAsset1Value === "bigint") {
      outstandingAsset1 = outstandingAsset1Value;
    }

    if (typeof outstandingAsset2Value === "bigint") {
      outstandingAsset2 = outstandingAsset2Value;
    }

    if (typeof outstandingLiquidityTokenValue === "bigint") {
      outstandingLiquidityTokens = outstandingLiquidityTokenValue;
    }
  }

  let asset1Balance = 0n;
  let asset2Balance = 0n;
  let liquidityTokenBalance = 0n;

  for (const asset of info.assets) {
    const id = asset["asset-id"];
    const {amount} = asset;

    /* eslint-disable eqeqeq */
    if (id == pool.asset1ID) {
      asset1Balance = BigInt(amount);
    } else if (id == pool.asset2ID) {
      asset2Balance = BigInt(amount);
    } else if (id == pool.liquidityTokenID) {
      liquidityTokenBalance = BigInt(amount);
    }
    /* eslint-enable eqeqeq */
  }

  if (pool.asset2ID === 0) {
    const minBalance = getMinBalanceForAccount(info);

    asset2Balance = BigInt(info.amount) - minBalance;
  }

  const reserves = {
    round: Number(info.round),
    asset1: asset1Balance - outstandingAsset1,
    asset2: asset2Balance - outstandingAsset2,
    issuedLiquidity: TOTAL_LIQUIDITY - liquidityTokenBalance + outstandingLiquidityTokens
  };

  if (
    reserves.asset1 < 0n ||
    reserves.asset2 < 0n ||
    reserves.issuedLiquidity < 0n ||
    reserves.issuedLiquidity > TOTAL_LIQUIDITY
  ) {
    // @ts-ignore: Type 'number' is not assignable to type 'bigint'
    reserves.asset1 = Number(reserves.asset1);
    // @ts-ignore: Type 'number' is not assignable to type 'bigint'
    reserves.asset2 = Number(reserves.asset2);
    // @ts-ignore: Type 'number' is not assignable to type 'bigint'
    reserves.issuedLiquidity = Number(reserves.issuedLiquidity);

    throw new Error(`Invalid pool reserves: ${JSON.stringify(reserves)}`);
  }

  return reserves;
}
/* eslint-enable complexity */

const EXCESS_ENCODED = encodeString("e");

export async function getAccountExcess({
  client,
  pool,
  accountAddr
}: {
  client: any;
  pool: PoolInfo;
  accountAddr: string;
}): Promise<AccountExcess> {
  const info = (await client
    .accountInformation(accountAddr)
    .setIntDecoding("bigint")
    .do()) as AccountInformation;

  const appsLocalState = info["apps-local-state"] || [];

  let excessAsset1 = 0n;
  let excessAsset2 = 0n;
  let excessLiquidityTokens = 0n;

  for (const app of appsLocalState) {
    // eslint-disable-next-line eqeqeq
    if (app.id != pool.validatorAppID) {
      continue;
    }

    const keyValue = app["key-value"];

    if (!keyValue) {
      break;
    }

    const state = decodeState(keyValue);

    const excessAsset1Key = fromByteArray(
      joinByteArrays([
        algosdk.decodeAddress(pool.addr).publicKey,
        EXCESS_ENCODED,
        algosdk.encodeUint64(pool.asset1ID)
      ])
    );
    const excessAsset2Key = fromByteArray(
      joinByteArrays([
        algosdk.decodeAddress(pool.addr).publicKey,
        EXCESS_ENCODED,
        algosdk.encodeUint64(pool.asset2ID)
      ])
    );
    const excessLiquidityTokenKey = fromByteArray(
      joinByteArrays([
        algosdk.decodeAddress(pool.addr).publicKey,
        EXCESS_ENCODED,
        algosdk.encodeUint64(pool.liquidityTokenID!)
      ])
    );

    const excessAsset1Value = state[excessAsset1Key];
    const excessAsset2Value = state[excessAsset2Key];
    const excessLiquidityTokenValue = state[excessLiquidityTokenKey];

    if (typeof excessAsset1Value === "bigint") {
      excessAsset1 = excessAsset1Value;
    }

    if (typeof excessAsset2Value === "bigint") {
      excessAsset2 = excessAsset2Value;
    }

    if (typeof excessLiquidityTokenValue === "bigint") {
      excessLiquidityTokens = excessLiquidityTokenValue;
    }
  }

  const excessAssets = {
    excessAsset1,
    excessAsset2,
    excessLiquidityTokens
  };

  if (
    excessAssets.excessAsset1 < 0n ||
    excessAssets.excessAsset2 < 0n ||
    excessAssets.excessLiquidityTokens < 0n
  ) {
    throw new Error(`Invalid excess assets: ${excessAssets}`);
  }

  return excessAssets;
}

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

interface GetPoolAssetsReturnedValue {
  asset1ID: number;
  asset2ID: number;
  liquidityTokenID: number;
}

const POOL_ASSETS_CACHE: Record<string, GetPoolAssetsReturnedValue> = {};

export async function getPoolAssets({
  client,
  address,
  validatorAppID
}: {
  client: any;
  address: string;
  validatorAppID: number;
}): Promise<GetPoolAssetsReturnedValue | null> {
  if (POOL_ASSETS_CACHE[address]) {
    return POOL_ASSETS_CACHE[address];
  }

  const info = (await client.accountInformation(address).do()) as AccountInformation;

  // eslint-disable-next-line eqeqeq
  const appState = info["apps-local-state"].find((app) => app.id == validatorAppID);
  let assets: GetPoolAssetsReturnedValue | null = null;

  if (appState) {
    const keyValue = appState["key-value"];
    const state = decodeState(keyValue);

    const asset1Key = "YTE="; // 'a1' in base64
    const asset2Key = "YTI="; // 'a2' in base64

    // The Liquidity Token is the only asset the Pool has created
    const liquidityTokenAsset = info["created-assets"][0];
    const liquidityTokenID = liquidityTokenAsset.index;

    assets = {
      asset1ID: state[asset1Key] as number,
      asset2ID: state[asset2Key] as number,
      liquidityTokenID
    };

    POOL_ASSETS_CACHE[address] = assets;
  }

  return assets;
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
export function isPoolNotCreated(pool: undefined | null | PoolInfo) {
  return pool?.status === PoolStatus.NOT_CREATED;
}

/**
 * @param pool - Pool info
 * @returns true if pool's status is READY, otherwise returns false
 */
export function isPoolReady(pool: undefined | null | PoolInfo) {
  return pool?.status === PoolStatus.READY;
}
