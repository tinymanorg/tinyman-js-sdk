import {Algodv2} from "algosdk";

import {
  ContractVersionValue,
  CONTRACT_VERSION,
  tinymanContract_v1_1,
  tinymanContract_v2
} from "../contract/contract";
import {TinymanAnalyticsApiAsset} from "../util/asset/assetModels";
import {SupportedNetwork, SignerTransaction, InitiatorSigner} from "../util/commonTypes";
import {
  BASE_MINIMUM_BALANCE,
  MINIMUM_BALANCE_REQUIRED_PER_ASSET,
  MINIMUM_BALANCE_REQUIRED_PER_APP,
  MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE,
  MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA
} from "../util/constant";
import {PoolInfo} from "../util/pool/poolTypes";
import {BootstrapV1_1} from "./v1_1";
import {BootstrapV2} from "./v2";

export function generateTxns({
  client,
  network,
  contractVersion,
  asset_1,
  asset_2,
  initiatorAddr
}: {
  client: Algodv2;
  network: SupportedNetwork;
  contractVersion: ContractVersionValue;
  asset_1: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
  asset_2: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  if (contractVersion === CONTRACT_VERSION.V1_1) {
    return BootstrapV1_1.generateTxns({
      client,
      network,
      asset1ID: Number(asset_1.id),
      asset2ID: Number(asset_2.id),
      asset1UnitName: asset_1.unit_name,
      asset2UnitName: asset_2.unit_name,
      initiatorAddr
    });
  }

  return BootstrapV2.generateTxns({
    client,
    network,
    asset_1,
    asset_2,
    initiatorAddr
  });
}

export function signTxns(params: {
  contractVersion: ContractVersionValue;
  txGroup: SignerTransaction[];
  network: SupportedNetwork;
  initiatorSigner: InitiatorSigner;
  asset1ID: number;
  asset2ID: number;
}): Promise<{signedTxns: Uint8Array[]; txnIDs: string[]}> {
  if (params.contractVersion === CONTRACT_VERSION.V1_1) {
    return BootstrapV1_1.signTxns(params);
  }

  return BootstrapV2.signTxns(params);
}

export function execute(params: {
  client: Algodv2;
  contractVersion: ContractVersionValue;
  network: SupportedNetwork;
  pool: {asset1ID: number; asset2ID: number};
  signedTxns: Uint8Array[];
  txnIDs: string[];
}): Promise<PoolInfo> {
  if (params.contractVersion === CONTRACT_VERSION.V1_1) {
    return BootstrapV1_1.execute(params);
  }

  return BootstrapV2.execute(params);
}

/**
 * @returns Minimum balance for a pool account
 */
export function getPoolAccountMinBalance(
  // Local state uint count and Local state byte slice count changes between different contract versions
  contractVersion: ContractVersionValue,
  isAlgoPool: boolean
) {
  const {
    schema: {numLocalInts, numLocalByteSlices}
  } =
    contractVersion === CONTRACT_VERSION.V1_1 ? tinymanContract_v1_1 : tinymanContract_v2;

  let fee =
    BASE_MINIMUM_BALANCE +
    MINIMUM_BALANCE_REQUIRED_PER_ASSET + // min balance to create asset
    MINIMUM_BALANCE_REQUIRED_PER_ASSET + // fee + min balance to opt into asset 1
    MINIMUM_BALANCE_REQUIRED_PER_APP + // min balance to opt into validator app
    MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE * numLocalInts +
    MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA * numLocalByteSlices;

  if (!isAlgoPool) {
    fee += MINIMUM_BALANCE_REQUIRED_PER_ASSET; // min balance to opt into asset 2
  }

  return fee;
}

/**
 * TODO: Do we need `calculateBootstrapFundingTxnAmount` instead of
 * separate functions for v1 and v2?
 */

/**
 * TODO: `function getMinBalanceRequiredToCreatePool({`
 *  * Calculates the minimum Algo balance an account should have to be able to create a pool
 *  Implementation will be similar to Web Client's `minRequiredBalanceToCreatePool`. So, the amount will be: currentMinBalanceForAccount + fundingTxnAmount + totalFees
 */
