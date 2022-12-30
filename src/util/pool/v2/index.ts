import {Algodv2} from "algosdk";

import {getContract} from "../../../contract";
import {CONTRACT_VERSION} from "../../../contract/constants";
import {getValidatorAppID} from "../../../validator";
import {
  getAccountInformation,
  getDecodedAccountApplicationLocalState
} from "../../account/accountUtils";
import {sortAssetIds} from "../../asset/assetUtils";
import {SupportedNetwork} from "../../commonTypes";
import {DECODED_APP_STATE_KEYS} from "../poolConstants";
import {V2PoolInfo, PoolStatus, PoolReserves, PoolAssets} from "../poolTypes";

/**
 * @returns Information object for the pool with given arguments
 */
export async function getPoolInfo(params: {
  client: Algodv2;
  network: SupportedNetwork;
  asset1ID: number;
  asset2ID: number;
}): Promise<V2PoolInfo> {
  const {client, network, asset1ID, asset2ID} = params;
  const contract = getContract(CONTRACT_VERSION.V2);
  const poolLogicSig = contract.generateLogicSigAccountForPool(params);
  const validatorAppID = getValidatorAppID(network, CONTRACT_VERSION.V2);
  const poolAddress = poolLogicSig.address();
  const sortedAssetIDs = sortAssetIds(asset1ID, asset2ID);

  const accountInformation = await getAccountInformation(client, poolAddress);
  const appState = getDecodedAccountApplicationLocalState(
    accountInformation,
    validatorAppID
  );

  let result: V2PoolInfo = {
    account: poolLogicSig,
    validatorAppID,
    asset1ID: sortedAssetIDs[0],
    asset2ID: sortedAssetIDs[1],
    status: appState ? PoolStatus.READY : PoolStatus.NOT_CREATED,
    contractVersion: CONTRACT_VERSION.V2
  };

  if (appState) {
    result.asset1ProtocolFees = BigInt(
      appState[DECODED_APP_STATE_KEYS.v2.asset1ProtocolFees]
    );
    result.asset2ProtocolFees = BigInt(
      appState[DECODED_APP_STATE_KEYS.v2.asset2ProtocolFees]
    );
    result.asset1Reserves = BigInt(appState[DECODED_APP_STATE_KEYS.v2.asset1Reserves]);
    result.asset2Reserves = BigInt(appState[DECODED_APP_STATE_KEYS.v2.asset2Reserves]);
    result.issuedPoolTokens = BigInt(
      appState[DECODED_APP_STATE_KEYS.v2.issuedPoolTokens]
    );
    result.cumulativePriceUpdateTimeStamp = Number(
      appState[DECODED_APP_STATE_KEYS.v2.cumulativePriceUpdateTimeStamp]
    );
    result.protocolFeeRatio = Number(
      appState[DECODED_APP_STATE_KEYS.v2.protocolFeeRatio]
    );
    result.totalFeeShare = BigInt(appState[DECODED_APP_STATE_KEYS.v2.totalFeeShare]);
    result.poolTokenID = Number(appState[DECODED_APP_STATE_KEYS.v2.poolTokenID]);
    result.asset1ID = Number(appState[DECODED_APP_STATE_KEYS.v2.asset1]);
    result.asset2ID = Number(appState[DECODED_APP_STATE_KEYS.v2.asset2]);
  }

  return result;
}

export async function getPoolReserves(
  client: Algodv2,
  pool: V2PoolInfo
): Promise<PoolReserves> {
  const accountInformation = await getAccountInformation(client, pool.account.address());
  const appState = getDecodedAccountApplicationLocalState(
    accountInformation,
    pool.validatorAppID
  );
  const reserves: PoolReserves = {
    asset1: 0n,
    asset2: 0n,
    issuedLiquidity: 0n,
    round: accountInformation.round
  };

  if (appState) {
    reserves.asset1 = BigInt(appState[DECODED_APP_STATE_KEYS.v2.asset1Reserves]);
    reserves.asset2 = BigInt(appState[DECODED_APP_STATE_KEYS.v2.asset2Reserves]);
    reserves.issuedLiquidity = BigInt(
      appState[DECODED_APP_STATE_KEYS.v2.issuedPoolTokens]
    );
  }

  return reserves;
}

export async function getPoolAssets({
  client,
  address,
  network
}: {
  client: Algodv2;
  address: string;
  network: SupportedNetwork;
}): Promise<PoolAssets | null> {
  const info = await getAccountInformation(client, address);
  const appState = getDecodedAccountApplicationLocalState(
    info,
    getValidatorAppID(network, CONTRACT_VERSION.V2)
  );

  let assets: PoolAssets | null = null;

  if (appState) {
    assets = {
      asset1ID: appState[DECODED_APP_STATE_KEYS[CONTRACT_VERSION.V2].asset1] as number,
      asset2ID: appState[DECODED_APP_STATE_KEYS[CONTRACT_VERSION.V2].asset2] as number,
      poolTokenID: appState[
        DECODED_APP_STATE_KEYS[CONTRACT_VERSION.V2].poolTokenID
      ] as number
    };
  }

  return assets;
}
