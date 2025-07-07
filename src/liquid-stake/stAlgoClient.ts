import algosdk, {bigIntToBytes} from "algosdk";
import {fromByteArray} from "base64-js";

import {SECOND_IN_MS} from "../governance/constants";
import {
  STALGO_ASSET_ID,
  TALGO_ASSET_ID,
  TINY_ASSET_ID
} from "../util/asset/assetConstants";
import {Struct} from "../util/client/base/utils";
import {SupportedNetwork} from "../util/commonTypes";
import {encodeString} from "../util/util";
import {
  CURRENT_REWARD_RATE_PER_TIME_END_TIMESTAMP_KEY,
  RESTAKE_APP_ID,
  STRUCTS,
  VAULT_APP_ID
} from "./constants";
import TinymanBaseClient from "../util/client/base/baseClient";

const USER_STATE = new Struct("UserState", STRUCTS);

class TinymanSTAlgoClient extends TinymanBaseClient<number, algosdk.Address> {
  vaultAppId: number;
  constructor(algod: algosdk.Algodv2, network: SupportedNetwork) {
    super(algod, RESTAKE_APP_ID[network], network, STRUCTS);

    this.vaultAppId = VAULT_APP_ID[network];
  }

  async increaseStake(amount: bigint, userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();
    const userStateBoxName = this.getUserStateBoxName(userAddress);

    const txns = [
      ...(await this.getApplyRateChangeTxnIfNeeded(userAddress)),
      ...(await this.getUserBoxPaymentTxnIfNeeded(userAddress, suggestedParams)),
      ...(await this.getOptinTxnIfNeeded(userAddress, STALGO_ASSET_ID[this.network])),
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: userAddress,
        receiver: this.applicationAddress,
        amount,
        assetIndex: TALGO_ASSET_ID[this.network],
        suggestedParams
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("increase_stake"), bigIntToBytes(amount, 8)],
        foreignApps: [this.vaultAppId],
        foreignAssets: [STALGO_ASSET_ID[this.network]],
        boxes: [
          {appIndex: 0, name: userStateBoxName},
          {appIndex: this.vaultAppId, name: userStateBoxName}
        ],
        suggestedParams
      })
    ];

    return Promise.all(
      this.setupTxnFeeAndAssignGroupId({
        txns,
        additionalFeeCount: 2
      })
    );
  }

  async decreaseStake(amount: bigint, userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();
    const userStateBoxName = this.getUserStateBoxName(userAddress);

    const txns = [
      ...(await this.getApplyRateChangeTxnIfNeeded(userAddress)),
      ...(await this.getOptinTxnIfNeeded(userAddress, TALGO_ASSET_ID[this.network])),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("decrease_stake"), bigIntToBytes(amount, 8)],
        foreignAssets: [TALGO_ASSET_ID[this.network], STALGO_ASSET_ID[this.network]],
        boxes: [{appIndex: 0, name: userStateBoxName}],
        suggestedParams
      })
    ];

    return Promise.all(this.setupTxnFeeAndAssignGroupId({txns, additionalFeeCount: 2}));
  }

  async claimRewards(userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();
    const userStateBoxName = this.getUserStateBoxName(userAddress);

    const txns = [
      ...(await this.getApplyRateChangeTxnIfNeeded(userAddress)),
      ...(await this.getOptinTxnIfNeeded(userAddress, TINY_ASSET_ID[this.network])),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("claim_rewards")],
        foreignAssets: [TINY_ASSET_ID[this.network]],
        foreignApps: [this.vaultAppId],
        boxes: [
          {appIndex: 0, name: userStateBoxName},
          {appIndex: this.vaultAppId, name: userStateBoxName}
        ],
        suggestedParams
      })
    ];

    return Promise.all(this.setupTxnFeeAndAssignGroupId({txns, additionalFeeCount: 3}));
  }

  async calculateIncreaseStakeFee(accountAddress: string, minFee: bigint) {
    const shouldApplyRateChange = await this.shouldApplyRateChange();
    const shouldOptin = !(await this.isOptedIn(
      accountAddress,
      STALGO_ASSET_ID[this.network]
    ));
    const doesUserBoxExist = await this.boxExists(
      this.getUserStateBoxName(accountAddress)
    );
    const initialTxnCount = 4;
    const totalTxnCount =
      initialTxnCount +
      Number(shouldApplyRateChange) +
      Number(shouldOptin) +
      Number(!doesUserBoxExist);

    return BigInt(totalTxnCount) * minFee;
  }

  async calculateDecreaseStakeFee(accountAddress: string, minFee: bigint) {
    const shouldApplyRateChange = await this.shouldApplyRateChange();
    const shouldOptin = !(await this.isOptedIn(
      accountAddress,
      TALGO_ASSET_ID[this.network]
    ));
    const initialTxnCount = 3;
    const totalTxnCount =
      initialTxnCount + Number(shouldApplyRateChange) + Number(shouldOptin);

    return BigInt(totalTxnCount) * minFee;
  }

  private getUserStateBoxName(userAddress: string) {
    return algosdk.decodeAddress(userAddress).publicKey;
  }

  private async getApplyRateChangeTxnIfNeeded(userAddress: string) {
    if (await this.shouldApplyRateChange()) {
      return this.getApplyRateChangeTxn(userAddress);
    }

    return [];
  }

  private async getUserBoxPaymentTxnIfNeeded(
    userAddress: string,
    suggestedParams: algosdk.SuggestedParams
  ) {
    const userStateBoxName = this.getUserStateBoxName(userAddress);

    if (!(await this.boxExists(userStateBoxName))) {
      return this.getUserBoxPaymentTxn(userStateBoxName, userAddress, suggestedParams);
    }

    return [];
  }

  private getUserBoxPaymentTxn(
    userStateBoxName: Uint8Array,
    userAddress: string,
    suggestedParams: algosdk.SuggestedParams
  ) {
    const newBox: Record<string, Struct> = {
      [fromByteArray(userStateBoxName)]: USER_STATE
    };

    const boxPaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: userAddress,
      receiver: this.applicationAddress,
      suggestedParams,
      amount: this.calculateMinBalance({boxes: newBox})
    });

    return [boxPaymentTxn];
  }

  private async shouldApplyRateChange() {
    const now = Math.floor(Date.now() / SECOND_IN_MS);

    const currentRateEndTimestamp = await this.getGlobal(
      encodeString(CURRENT_REWARD_RATE_PER_TIME_END_TIMESTAMP_KEY)
    );

    return currentRateEndTimestamp <= now;
  }

  private async getApplyRateChangeTxn(userAddress: string) {
    return [
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("apply_rate_change")],
        suggestedParams: await this.getSuggestedParams()
      })
    ];
  }
}

export {TinymanSTAlgoClient};
