import {Algodv2} from "algosdk";

import {ContractVersionValue} from "../contract/types";
import {CONTRACT_VERSION} from "../contract/constants";
import {TinymanAnalyticsApiAsset} from "../util/asset/assetModels";
import {SupportedNetwork, SignerTransaction, InitiatorSigner} from "../util/commonTypes";
import {V1PoolInfo, V2PoolInfo} from "../util/pool/poolTypes";
import {BootstrapV1_1} from "./v1_1";
import {BootstrapV2} from "./v2";

export function generateTxns(params: {
  client: Algodv2;
  network: SupportedNetwork;
  contractVersion: ContractVersionValue;
  asset_1: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
  asset_2: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  if (params.contractVersion === CONTRACT_VERSION.V1_1) {
    return BootstrapV1_1.generateTxns(params);
  }

  return BootstrapV2.generateTxns(params);
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

export function execute(
  params:
    | (Parameters<typeof BootstrapV2.execute>[0] & {
        contractVersion: typeof CONTRACT_VERSION.V2;
      })
    | (Parameters<typeof BootstrapV1_1.execute>[0] & {
        contractVersion: typeof CONTRACT_VERSION.V1_1;
      })
): Promise<V1PoolInfo | V2PoolInfo> {
  if (params.contractVersion === CONTRACT_VERSION.V1_1) {
    return BootstrapV1_1.execute(params);
  }

  return BootstrapV2.execute(params);
}

/**
 *  Calculates the amount of funding txn for creating a pool
 */
export function calculateBootstrapFundingTxnAmount({
  contractVersion,
  isAlgoPool,
  minFee
}: {
  contractVersion: ContractVersionValue;
  isAlgoPool: boolean;
  minFee: bigint;
}): number {
  if (contractVersion === CONTRACT_VERSION.V1_1) {
    return BootstrapV1_1.getBootstrapFundingTxnAmount(isAlgoPool);
  }

  return BootstrapV2.getBootstrapFundingTxnAmount(isAlgoPool, minFee);
}
