import algosdk, {Algodv2, getApplicationAddress, Transaction} from "algosdk";

import {SupportedNetwork} from "../../commonTypes";
import {
  MINIMUM_BALANCE_REQUIREMENT_PER_ACCOUNT,
  MINIMUM_BALANCE_REQUIREMENT_PER_ASSET
} from "./constants";
import {StructDefinition} from "./types";
import {getBoxCosts, getStruct, Struct} from "./utils";
import {areBuffersEqual} from "../../../governance/util/utils";

abstract class TinymanBaseClient {
  algod: Algodv2;
  appId: number;
  applicationAddress: algosdk.Address;
  network: SupportedNetwork;
  readonly structs: Record<string, StructDefinition> | undefined;

  constructor(
    algod: Algodv2,
    appId: number,
    network: SupportedNetwork,
    structs?: Record<string, StructDefinition>
  ) {
    this.algod = algod;
    this.appId = appId;
    this.applicationAddress = getApplicationAddress(this.appId);
    this.network = network;
    this.structs = structs;
  }

  protected setupTxnFeeAndAssignGroupId({
    txns,
    additionalFeeCount = 0
  }: {
    txns: algosdk.Transaction[];
    additionalFeeCount?: number;
  }) {
    const {fee} = txns[0];

    const transactions = txns.map((txn) => {
      txn.fee = 0n;

      return txn;
    });

    transactions[0].fee = BigInt(transactions.length + additionalFeeCount) * fee;

    return algosdk.assignGroupID(transactions);
  }

  protected async getGlobal(key: Uint8Array, defaultValue?: any, appId?: number) {
    const applicationId = appId || this.appId;

    const applicationInfo = await this.algod.getApplicationByID(applicationId).do();
    const globalState = applicationInfo.params.globalState ?? [];

    const searchValue = globalState.find((item: algosdk.modelsv2.TealKeyValue) =>
      areBuffersEqual(item.key, key)
    )?.value;

    if (searchValue) {
      if (searchValue.type === 2) {
        return searchValue.uint;
      }

      return searchValue.bytes;
    }

    return defaultValue;
  }

  protected calculateMinBalance({
    accounts = 0,
    assets = 0,
    boxes
  }: {
    accounts?: number;
    assets?: number;
    boxes?: Record<string, Struct>;
  }) {
    let cost = 0;

    cost += accounts * MINIMUM_BALANCE_REQUIREMENT_PER_ACCOUNT;
    cost += assets * MINIMUM_BALANCE_REQUIREMENT_PER_ASSET;
    cost += getBoxCosts(boxes || {});

    return cost;
  }

  protected async boxExists(boxName: Uint8Array, appId?: number) {
    const applicationId = appId || this.appId;

    try {
      const box = await this.algod.getApplicationBoxByName(applicationId, boxName).do();

      return Boolean(box);
    } catch (e) {
      return false;
    }
  }

  protected async getBox(boxName: Uint8Array, structName: string, appId?: number) {
    try {
      const applicationId = appId || this.appId;
      const boxValue = (
        await this.algod.getApplicationBoxByName(applicationId, boxName).do()
      ).value;

      if (!this.structs) {
        throw new Error("structs not defined");
      }

      const structClass = getStruct(structName, this.structs);

      return structClass.apply(Buffer.from(boxValue));
    } catch (error: any) {
      if (error.message.includes("box not found")) {
        return null;
      }

      throw new Error(error);
    }
  }

  protected async getOptinTxnIfNeeded(sender: string, assetId: number) {
    const txn: Transaction[] = [];

    if (!(await this.isOptedIn(sender, assetId))) {
      const suggestedParams = await this.getSuggestedParams();

      txn.push(
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender,
          receiver: sender,
          assetIndex: assetId,
          amount: 0,
          suggestedParams
        })
      );
    }

    return txn;
  }

  protected async isOptedIn(accountAddress: string | algosdk.Address, assetId: number) {
    try {
      await this.algod.accountAssetInformation(accountAddress, assetId).do();

      return true;
    } catch (e) {
      return false;
    }
  }

  protected getSuggestedParams() {
    return this.algod.getTransactionParams().do();
  }
}

export default TinymanBaseClient;
