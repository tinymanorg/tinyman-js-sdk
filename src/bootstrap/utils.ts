import {Algodv2} from "algosdk";

import {
  ContractVersion,
  CONTRACT_VERSION,
  tinymanContract_v1_1,
  tinymanContract_v2
} from "../contract/contract";
import {TinymanAnalyticsApiAsset} from "../util/asset/assetModels";
// TODO: add unused import rule
import {orderByAssetId} from "../util/asset/assetUtils";
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
  contractVersion: ContractVersion;
  asset_1: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
  asset_2: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  if (contractVersion === CONTRACT_VERSION.v1_1) {
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
    contractVersion,
    asset_1,
    asset_2,
    initiatorAddr
  });
}

export function signTxns(params: {
  contractVersion: ContractVersion;
  txGroup: SignerTransaction[];
  network: SupportedNetwork;
  initiatorSigner: InitiatorSigner;
  asset1ID: number;
  asset2ID: number;
}): Promise<{signedTxns: Uint8Array[]; txnIDs: string[]}> {
  if (params.contractVersion === CONTRACT_VERSION.v1_1) {
    return BootstrapV1_1.signTxns(params);
  }

  return BootstrapV2.signTxns(params);
}

export function execute(params: {
  client: Algodv2;
  contractVersion: ContractVersion;
  network: SupportedNetwork;
  pool: {asset1ID: number; asset2ID: number};
  signedTxns: Uint8Array[];
  txnIDs: string[];
}): Promise<PoolInfo> {
  if (params.contractVersion === CONTRACT_VERSION.v1_1) {
    return BootstrapV1_1.execute(params);
  }

  return BootstrapV2.execute(params);
}

/**
 *  @returns The amount of funding txn for creating a pool
 */
export function calculateBootstrapFundingTxnAmount({
  contractVersion,
  isAlgoPool,
  txnFee
}: {
  contractVersion: ContractVersion;
  isAlgoPool: boolean;
  /*
   * txnFee is the current fee the Algorand network gets from a single txn.
   */
  txnFee: number;
}): number {
  /**
   * TODO: Convert to switch?
   * TODO: Fix the logic
   * https://hipo.slack.com/archives/C040R0QEVM3/p1665491908620689
   * v1 version: https://github.com/Hipo/tinyman-js-sdk/blob/0bfce768500980bc2c9440580df75dea606a9a45/src/bootstrap.ts#L31
   * v2 py version: https://github.com/Hipo/private-tinyman-py-sdk/blob/c90c3171d59b7ce86c3d3ce49616b4af1663b5e9/tinyman/v2/pools.py#L328
   *
   */

  const poolAccountMinBalance = getPoolAccountMinBalance(contractVersion, isAlgoPool);

  if (contractVersion === CONTRACT_VERSION.V1_1) {
    // For v1_1, the amount is: getPoolAccountMinBalance() + (isAlgoPool ? 4 : 3) * txnFee;
    return poolAccountMinBalance + (isAlgoPool ? 4 : 3) * txnFee;
  }

  // For v2, the amount is: getPoolAccountMinBalance() + txnFee +  MINIMUM_BALANCE_REQUIRED_PER_ASSET;
  return (
    poolAccountMinBalance +
    (isAlgoPool ? 6 : 5) * txnFee +
    MINIMUM_BALANCE_REQUIRED_PER_ASSET
  );
}

/**
 * @returns Minimum balance for a pool account
 */
export function getPoolAccountMinBalance(
  // Local state uint count and Local state byte slice count changes between different contract versions
  contractVersion: ContractVersion,
  isAlgoPool: boolean
) {
  const {
    schema: {numLocalInts, numLocalByteSlices}
  } =
    contractVersion === CONTRACT_VERSION.v1_1 ? tinymanContract_v1_1 : tinymanContract_v2;

  return (
    BASE_MINIMUM_BALANCE +
    MINIMUM_BALANCE_REQUIRED_PER_ASSET + // min balance to create asset
    MINIMUM_BALANCE_REQUIRED_PER_ASSET + // fee + min balance to opt into asset 1
    (isAlgoPool ? 0 : MINIMUM_BALANCE_REQUIRED_PER_ASSET) + // min balance to opt into asset 2
    MINIMUM_BALANCE_REQUIRED_PER_APP + // min balance to opt into validator app
    MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE * numLocalInts +
    MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA * numLocalByteSlices
  );
}

/**
 * TODO: `function getMinBalanceRequiredToCreatePool({`
 *  * Calculates the minimum Algo balance an account should have to be able to create a pool
 *  Implementation will be similar to Web Client's `minRequiredBalanceToCreatePool`. So, the amount will be: currentMinBalanceForAccount + fundingTxnAmount + totalFees
 */
