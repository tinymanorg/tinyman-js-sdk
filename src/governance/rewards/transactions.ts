import algosdk, {SuggestedParams, Transaction, getApplicationAddress} from "algosdk";

import {getAccountPowerBoxName, getAccountStateBoxName} from "../vault/storage";
import {
  REWARD_CLAIM_SHEET_BOX_COST,
  REWARD_CLAIM_SHEET_BOX_SIZE,
  REWARD_PERIOD_BOX_ARRAY_LEN
} from "./constants";
import {getAccountRewardClaimSheetBoxName, getRewardPeriodBoxName} from "./storage";
import {ACCOUNT_POWER_BOX_ARRAY_LEN} from "../vault/constants";
import {intToBytes} from "../util/utils";
import {prepareBudgetIncreaseTxn} from "../transactions";
import {concatUint8Arrays} from "../utils";
import {encodeString} from "../../util/util";

function prepareClaimRewardsTransactions({
  rewardsAppId,
  vaultAppId,
  tinyAssetId,
  sender,
  periodIndexStart,
  periodCount,
  accountPowerIndexes,
  suggestedParams,
  createRewardClaimSheet,
  appCallNote
}: {
  rewardsAppId: number;
  vaultAppId: number;
  tinyAssetId: number;
  sender: string;
  periodIndexStart: number;
  periodCount: number;
  accountPowerIndexes: number[];
  suggestedParams: SuggestedParams;
  createRewardClaimSheet: boolean;
  appCallNote?: string;
}): Transaction[] {
  let boxes: algosdk.BoxReference[] = [];
  const rewardPeriodBoxes: algosdk.BoxReference[] = [];
  const accountRewardClaimSheetBoxes: algosdk.BoxReference[] = [];
  const accountPowerBoxes: algosdk.BoxReference[] = [];

  for (
    let periodIndex = periodIndexStart;
    periodIndex < periodIndexStart + periodCount;
    periodIndex++
  ) {
    const rewardPeriodBoxIndex = Math.floor(periodIndex / REWARD_PERIOD_BOX_ARRAY_LEN);
    const rewardPeriodBoxName = getRewardPeriodBoxName(rewardPeriodBoxIndex);

    if (
      !rewardPeriodBoxes.find(
        (box) => box.name.toString() === rewardPeriodBoxName.toString()
      )
    ) {
      rewardPeriodBoxes.push({appIndex: rewardsAppId, name: rewardPeriodBoxName});
    }

    const accountRewardClaimSheetBoxIndex = Math.floor(
      periodIndex / (REWARD_CLAIM_SHEET_BOX_SIZE * 8)
    );
    const accountRewardClaimSheetBoxName = getAccountRewardClaimSheetBoxName(
      sender,
      accountRewardClaimSheetBoxIndex
    );

    if (
      !accountRewardClaimSheetBoxes.find(
        (box) => box.name.toString() === accountRewardClaimSheetBoxName.toString()
      )
    ) {
      accountRewardClaimSheetBoxes.push({
        appIndex: rewardsAppId,
        name: accountRewardClaimSheetBoxName
      });
    }
  }

  for (const accountPowerIndex of accountPowerIndexes) {
    const accountPowerBoxIndex = Math.floor(
      accountPowerIndex / ACCOUNT_POWER_BOX_ARRAY_LEN
    );
    let boxName = getAccountPowerBoxName(sender, accountPowerBoxIndex);
    let accountPowerBox = {appIndex: vaultAppId, name: boxName};

    if (!accountPowerBoxes.find((box) => box.name.toString() === boxName.toString())) {
      accountPowerBoxes.push(accountPowerBox);
    }

    boxName = getAccountPowerBoxName(sender, accountPowerBoxIndex + 1);
    accountPowerBox = {appIndex: vaultAppId, name: boxName};

    if (!accountPowerBoxes.find((box) => box.name.toString() === boxName.toString())) {
      accountPowerBoxes.push(accountPowerBox);
    }
  }

  boxes = [
    {appIndex: vaultAppId, name: getAccountStateBoxName(sender)},
    ...accountRewardClaimSheetBoxes,
    ...rewardPeriodBoxes,
    ...accountPowerBoxes
  ];

  if (boxes.length >= 11) {
    throw new Error("Boxes' length cannot be larger than 10");
  }

  const txnsBoxes = boxes.slice(0, 6);
  const txns = [
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      suggestedParams,
      appIndex: rewardsAppId,
      appArgs: [
        encodeString("claim_rewards"),
        intToBytes(periodIndexStart),
        intToBytes(periodCount),
        concatUint8Arrays(...accountPowerIndexes.map((number) => intToBytes(number)))
      ],
      foreignApps: [vaultAppId],
      foreignAssets: [tinyAssetId],
      boxes: txnsBoxes,
      note: appCallNote ? encodeString(appCallNote) : undefined
    })
  ];

  txns[0].fee = txns[0].fee * BigInt(periodCount + 2);

  // TODO: Update budget costs according to final code. (backend note)
  let increaseBudgetTxnCount = 0;
  const requiredOpcodeBudget = 92 + 865 * periodCount;
  const opcodeBudget = 700 + 700 * periodCount;

  if (requiredOpcodeBudget > opcodeBudget) {
    increaseBudgetTxnCount = Math.floor((requiredOpcodeBudget - opcodeBudget) / 666) + 1;
  }

  if (increaseBudgetTxnCount || boxes.length > 6) {
    const budgetIncreaseBoxes = boxes.slice(6);
    const budgetIncreaseTxn = prepareBudgetIncreaseTxn({
      sender,
      suggestedParams,
      extraAppArgs: [intToBytes(Math.max(increaseBudgetTxnCount - 1, 0))],
      index: rewardsAppId,
      foreignApps: [vaultAppId],
      boxes: budgetIncreaseBoxes
    });

    budgetIncreaseTxn.fee *= BigInt(Math.max(increaseBudgetTxnCount, 1));

    txns.unshift(budgetIncreaseTxn);
  }

  if (createRewardClaimSheet) {
    const minimumBalancePayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: getApplicationAddress(rewardsAppId),
      amount: REWARD_CLAIM_SHEET_BOX_COST,
      suggestedParams
    });

    txns.unshift(minimumBalancePayment);
  }

  return algosdk.assignGroupID(txns);
}

export {prepareClaimRewardsTransactions};
