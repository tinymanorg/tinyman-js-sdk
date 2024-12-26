import algosdk, {Algodv2} from "algosdk";
import {fromByteArray} from "base64-js";

import {getContract} from "../../../contract";
import {CONTRACT_VERSION} from "../../../contract/constants";
import {getValidatorAppID} from "../../../validator";
import {
  getAccountInformation,
  getDecodedAccountApplicationLocalState
} from "../../account/accountUtils";
import {sortAssetIds} from "../../asset/assetUtils";
import {SupportedNetwork} from "../../commonTypes";
import {
  decodeState,
  encodeString,
  getMinBalanceForAccount,
  joinByteArrays
} from "../../util";
import {DECODED_APP_STATE_KEYS} from "../poolConstants";
import {PoolAssets, PoolReserves, PoolStatus, V1PoolInfo} from "../poolTypes";

const OUTSTANDING_ENCODED = encodeString("o");
const TOTAL_LIQUIDITY = 0xffffffffffffffffn;

export async function getPoolInfo(params: {
  client: Algodv2;
  network: SupportedNetwork;
  asset1ID: number;
  asset2ID: number;
}): Promise<V1PoolInfo> {
  const {client, network, asset1ID, asset2ID} = params;
  const contract = getContract(CONTRACT_VERSION.V1_1);
  const poolLogicSig = contract.generateLogicSigAccountForPool(params);
  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V1_1);
  const poolAddress = poolLogicSig.address();
  const sortedAssetIDs = sortAssetIds(asset1ID, asset2ID);
  const accountInformation = await getAccountInformation(client, poolAddress.toString());
  const appState = getDecodedAccountApplicationLocalState(
    accountInformation,
    validatorAppID
  );

  const poolTokenID = accountInformation.createdAssets?.length
    ? Number(accountInformation.createdAssets[0].index)
    : undefined;
  let result: V1PoolInfo = {
    account: poolLogicSig,
    validatorAppID,
    asset1ID: sortedAssetIDs[0],
    asset2ID: sortedAssetIDs[1],
    status: appState || poolTokenID ? PoolStatus.READY : PoolStatus.NOT_CREATED,
    contractVersion: CONTRACT_VERSION.V1_1,
    poolTokenID
  };

  if (appState) {
    result.asset1ID = Number(appState[DECODED_APP_STATE_KEYS.v1_1.asset1]);
    result.asset2ID = Number(appState[DECODED_APP_STATE_KEYS.v1_1.asset2]);
  }

  return result;
}

export async function getPoolReserves(
  client: Algodv2,
  pool: V1PoolInfo
): Promise<PoolReserves> {
  const info = await getAccountInformation(client, pool.account.address().toString());
  const {appsLocalState} = info;

  let outstandingAsset1 = 0n;
  let outstandingAsset2 = 0n;
  let outstandingPoolTokens = 0n;

  for (const app of appsLocalState) {
    if (app.id != BigInt(pool.validatorAppID)) {
      continue;
    }
    const {keyValue} = app;

    if (!keyValue) {
      break;
    }

    const state = decodeState({stateArray: keyValue});

    const outstandingAsset1Key = fromByteArray(
      joinByteArrays([OUTSTANDING_ENCODED, algosdk.encodeUint64(pool.asset1ID)])
    );
    const outstandingAsset2Key = fromByteArray(
      joinByteArrays([OUTSTANDING_ENCODED, algosdk.encodeUint64(pool.asset2ID)])
    );
    const outstandingPoolTokenKey = fromByteArray(
      joinByteArrays([OUTSTANDING_ENCODED, algosdk.encodeUint64(pool.poolTokenID!)])
    );

    const outstandingAsset1Value = state[outstandingAsset1Key];
    const outstandingAsset2Value = state[outstandingAsset2Key];
    const outstandingPoolTokenValue = state[outstandingPoolTokenKey];

    if (typeof outstandingAsset1Value === "bigint") {
      outstandingAsset1 = outstandingAsset1Value;
    }

    if (typeof outstandingAsset2Value === "bigint") {
      outstandingAsset2 = outstandingAsset2Value;
    }

    if (typeof outstandingPoolTokenValue === "bigint") {
      outstandingPoolTokens = outstandingPoolTokenValue;
    }
  }

  let asset1Balance = 0n;
  let asset2Balance = 0n;
  let poolTokenBalance = 0n;

  for (const asset of info.assets) {
    const id = Number(asset.assetId);
    const {amount} = asset;

    if (id == pool.asset1ID) {
      asset1Balance = amount;
    } else if (id == pool.asset2ID) {
      asset2Balance = amount;
    } else if (id == pool.poolTokenID) {
      poolTokenBalance = amount;
    }
  }

  if (pool.asset2ID === 0) {
    const minBalance = getMinBalanceForAccount(info);

    asset2Balance = info.amount - minBalance;

    if (asset2Balance < 0n) {
      asset2Balance = 0n;
    }
  }

  const reserves: PoolReserves = {
    asset1: asset1Balance - outstandingAsset1,
    asset2: asset2Balance - outstandingAsset2,
    issuedLiquidity: TOTAL_LIQUIDITY - poolTokenBalance + outstandingPoolTokens,
    round: info.round
  };

  /**
   * Although unlikely, it is possible that the pool reserves are below zero.
   * The reserves can only be negative if assets were withdrawn from the pool using clawback. It shouldn't happen any other way.
   */
  if (reserves.asset1 < 0n || reserves.asset2 < 0n) {
    throw new Error(
      "The pool reserves are below zero. The manager of one of the assets has used clawback to remove assets from this pool. Do not interact with the pool."
    );
  }

  if (reserves.issuedLiquidity < 0n || reserves.issuedLiquidity > TOTAL_LIQUIDITY) {
    throw new Error(
      `Issued liquidity value is out of the expected range ([0n, ${TOTAL_LIQUIDITY}]): ${reserves.issuedLiquidity}`
    );
  }

  return reserves;
}

/**
 * Find out the ids of a pool's liquidity token and assets
 */
export async function getPoolAssets(
  {
    client,
    address,
    network
  }: {
    client: Algodv2;
    address: string;
    network: SupportedNetwork;
  },
  cache: Record<string, PoolAssets> = {}
): Promise<PoolAssets | null> {
  if (cache[address]) {
    return cache[address];
  }

  const info = await getAccountInformation(client, address);
  const appState = getDecodedAccountApplicationLocalState(
    info,
    getValidatorAppID(network, CONTRACT_VERSION.V1_1)
  );

  let assets: PoolAssets | null = null;

  if (appState) {
    let poolTokenID: number;

    // The Pool Token is the only asset the Pool has created
    const poolTokenAsset = info.createdAssets![0];

    poolTokenID = Number(poolTokenAsset.index);

    assets = {
      asset1ID: Number(appState[DECODED_APP_STATE_KEYS[CONTRACT_VERSION.V1_1].asset1]),
      asset2ID: Number(appState[DECODED_APP_STATE_KEYS[CONTRACT_VERSION.V1_1].asset2]),
      poolTokenID
    };

    cache[address] = assets;
  }

  return assets;
}
