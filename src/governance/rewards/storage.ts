import {Algodv2, decodeAddress} from "algosdk";

import {intToBytes} from "../util/utils";
import {getRawBoxValue} from "../utils";
import {REWARD_CLAIM_SHEET_BOX_PREFIX, REWARD_PERIOD_BOX_PREFIX} from "./constants";

class RewardsAppGlobalState {
  tinyAssetId: number;
  vaultAppId: number;
  rewardHistoryCount: number;
  firstPeriodTimestamp: number;
  rewardPeriodCount: number;
  manager: string;
  rewardsManager: string;

  // eslint-disable-next-line max-params
  constructor(
    tinyAssetId: number,
    vaultAppId: number,
    rewardHistoryCount: number,
    firstPeriodTimestamp: number,
    rewardPeriodCount: number,
    manager: string,
    rewardsManager: string
  ) {
    this.tinyAssetId = tinyAssetId;
    this.vaultAppId = vaultAppId;
    this.rewardHistoryCount = rewardHistoryCount;
    this.firstPeriodTimestamp = firstPeriodTimestamp;
    this.rewardPeriodCount = rewardPeriodCount;
    this.manager = manager;
    this.rewardsManager = rewardsManager;
  }
}

class RewardClaimSheet {
  value: Uint8Array;

  constructor(value: Uint8Array) {
    this.value = value;
  }
}

function getRewardPeriodBoxName(boxIndex: number): Uint8Array {
  const boxIndexBytes = intToBytes(boxIndex);
  const combinedArray = new Uint8Array(
    REWARD_PERIOD_BOX_PREFIX.length + boxIndexBytes.length
  );

  combinedArray.set(REWARD_PERIOD_BOX_PREFIX, 0);
  combinedArray.set(boxIndexBytes, REWARD_PERIOD_BOX_PREFIX.length);

  return combinedArray;
}

function getAccountRewardClaimSheetBoxName(
  address: string,
  boxIndex: number
): Uint8Array {
  const decodedAddress = decodeAddress(address).publicKey;
  const boxIndexBytes = intToBytes(boxIndex);

  const combinedArray = new Uint8Array(
    REWARD_CLAIM_SHEET_BOX_PREFIX.length + decodedAddress.length + boxIndexBytes.length
  );

  combinedArray.set(REWARD_CLAIM_SHEET_BOX_PREFIX, 0);
  combinedArray.set(decodedAddress, REWARD_CLAIM_SHEET_BOX_PREFIX.length);
  combinedArray.set(
    boxIndexBytes,
    REWARD_CLAIM_SHEET_BOX_PREFIX.length + decodedAddress.length
  );

  return combinedArray;
}

async function getRewardClaimSheet(
  algod: Algodv2,
  appId: number,
  address: string,
  accountRewardClaimSheetBoxIndex: number
) {
  const boxName = getAccountRewardClaimSheetBoxName(
    address,
    accountRewardClaimSheetBoxIndex
  );

  const rawBox = await getRawBoxValue(algod, appId, boxName);

  if (!rawBox) {
    return null;
  }

  return new RewardClaimSheet(rawBox);
}

export {
  getAccountRewardClaimSheetBoxName,
  getRewardClaimSheet,
  getRewardPeriodBoxName,
  RewardClaimSheet,
  RewardsAppGlobalState
};
