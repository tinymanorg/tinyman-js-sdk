import algosdk, {Algodv2, SuggestedParams} from "algosdk";

import {VAULT_APP_ID, WEEK} from "../constants";
import {
  ACCOUNT_POWER_BOX_COST,
  ACCOUNT_STATE_BOX_COST,
  MIN_LOCK_AMOUNT,
  SLOPE_CHANGE_BOX_COST,
  TOTAL_POWER_BOX_COST
} from "./constants";
import {
  AccountState,
  SlopeChange,
  VaultAppGlobalState,
  getAccountPowerBoxName,
  getAccountStateBoxName,
  getSlopeChangeBoxName,
  getTotalPowerBoxName
} from "./storage";
import {prepareBudgetIncreaseTxn} from "../transactions";
import {getNewTotalPowerTimestamps} from "./utils";
import {SupportedNetwork} from "../../util/commonTypes";
import {encodeString, intToBytes} from "../../util/util";
import {TINY_ASSET_ID} from "../../util/asset/assetConstants";

function prepareCreateLockTransactions({
  accountState,
  lockEndTime,
  lockedAmount,
  network,
  sender,
  vaultAppGlobalState,
  suggestedParams,
  slopeChangeAtLockEndTime,
  appCallNote
}: {
  network: SupportedNetwork;
  sender: string;
  lockedAmount: number;
  lockEndTime: number;
  vaultAppGlobalState: VaultAppGlobalState;
  suggestedParams: SuggestedParams;
  accountState?: AccountState | null;
  slopeChangeAtLockEndTime?: SlopeChange | null;
  appCallNote?: Uint8Array;
}) {
  if (lockedAmount < MIN_LOCK_AMOUNT) {
    throw new Error("Insufficient lock amount");
  }

  if (lockEndTime % WEEK !== 0) {
    throw new Error("Invalid lock end time");
  }

  const vaultAppId = VAULT_APP_ID[network];

  // Boxes
  const accountStateBoxName = getAccountStateBoxName(sender);
  const lastTotalPowerBoxName = getTotalPowerBoxName(
    vaultAppGlobalState.lastTotalPowerBoxIndex
  );
  const nextTotalPowerBoxName = getTotalPowerBoxName(
    vaultAppGlobalState.lastTotalPowerBoxIndex + 1
  );
  const boxes: algosdk.BoxReference[] = [
    {appIndex: vaultAppId, name: accountStateBoxName},
    {appIndex: vaultAppId, name: lastTotalPowerBoxName},
    // Always pass the next total power box ref, other transactions may increase the total power count.
    {appIndex: vaultAppId, name: nextTotalPowerBoxName}
  ];

  if (accountState) {
    const lastAccountPowerBoxName = getAccountPowerBoxName(
      sender,
      accountState.lastAccountPowerBoxIndex
    );

    boxes.push({appIndex: vaultAppId, name: lastAccountPowerBoxName});

    if (!accountState.freeAccountPowerSpaceCount) {
      const nextAccountPowerBoxName = getAccountPowerBoxName(
        sender,
        accountState.lastAccountPowerBoxIndex + 1
      );

      boxes.push({appIndex: vaultAppId, name: nextAccountPowerBoxName});
    }
  } else {
    const accountPowerBoxName = getAccountPowerBoxName(sender, 0);

    boxes.push({appIndex: vaultAppId, name: accountPowerBoxName});
  }

  // slope change will be updated or created for lock end time
  const slopeChangeBoxName = getSlopeChangeBoxName(lockEndTime);

  boxes.push({appIndex: vaultAppId, name: slopeChangeBoxName});

  // contract will create weekly checkpoints automatically
  const newTotalPowerTimestamps = getNewTotalPowerTimestamps(
    vaultAppGlobalState.lastTotalPowerTimestamp,
    Date.now() / 1000
  );
  const newTotalPowerCount = newTotalPowerTimestamps.length;

  for (const timestamp of newTotalPowerTimestamps) {
    if (timestamp % WEEK === 0) {
      const newTimestampSlopeChangeBoxName = getSlopeChangeBoxName(timestamp);

      boxes.push({appIndex: vaultAppId, name: newTimestampSlopeChangeBoxName});
    }
  }

  // Min Balance
  let minBalanceIncrease = 0;

  if (!accountState) {
    minBalanceIncrease += ACCOUNT_STATE_BOX_COST;
    minBalanceIncrease += ACCOUNT_POWER_BOX_COST;
  } else if (!accountState.freeAccountPowerSpaceCount) {
    minBalanceIncrease += ACCOUNT_POWER_BOX_COST;
  }

  if (newTotalPowerCount > vaultAppGlobalState.freeTotalPowerSpaceCount) {
    minBalanceIncrease += TOTAL_POWER_BOX_COST;
  }

  if (!slopeChangeAtLockEndTime) {
    minBalanceIncrease += SLOPE_CHANGE_BOX_COST;
  }

  const txns = [
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      amount: lockedAmount,
      assetIndex: TINY_ASSET_ID[network],
      sender,
      receiver: algosdk.getApplicationAddress(vaultAppId),
      suggestedParams
    }),
    algosdk.makeApplicationNoOpTxnFromObject({
      appIndex: vaultAppId,
      sender,
      suggestedParams,
      appArgs: [encodeString("create_lock"), intToBytes(lockEndTime)],
      boxes: boxes.slice(0, 8),
      note: appCallNote
    }),
    prepareBudgetIncreaseTxn({
      sender,
      suggestedParams,
      index: vaultAppId,
      boxes: boxes.slice(8)
    })
  ];

  if (minBalanceIncrease) {
    const minimumBalancePayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: algosdk.getApplicationAddress(vaultAppId),
      amount: minBalanceIncrease,
      suggestedParams
    });

    txns.unshift(minimumBalancePayment);
  }

  const txnGroup = algosdk.assignGroupID(txns);

  return txnGroup;
}

function prepareIncreaseLockAmountTransactions({
  accountState,
  lockedAmount,
  network,
  sender,
  vaultAppGlobalState,
  suggestedParams,
  appCallNote
}: {
  network: SupportedNetwork;
  sender: string;
  lockedAmount: number;
  vaultAppGlobalState: VaultAppGlobalState;
  accountState: AccountState;
  suggestedParams: SuggestedParams;
  appCallNote?: Uint8Array;
}) {
  if (lockedAmount < MIN_LOCK_AMOUNT) {
    throw new Error("Insufficient lock amount");
  }

  // Boxes
  const accountStateBoxName = getAccountStateBoxName(sender);
  const accountPowerBoxName = getAccountPowerBoxName(
    sender,
    accountState.lastAccountPowerBoxIndex
  );
  const totalPowersBoxName = getTotalPowerBoxName(
    vaultAppGlobalState.lastTotalPowerBoxIndex
  );
  const nextTotalPowersBoxName = getTotalPowerBoxName(
    vaultAppGlobalState.lastTotalPowerBoxIndex + 1
  );
  let slopeChangeBoxName = getSlopeChangeBoxName(accountState.lockEndTime);

  const boxes: algosdk.BoxReference[] = [
    {appIndex: VAULT_APP_ID[network], name: accountStateBoxName},
    {appIndex: VAULT_APP_ID[network], name: accountPowerBoxName},
    {appIndex: VAULT_APP_ID[network], name: totalPowersBoxName},
    {appIndex: VAULT_APP_ID[network], name: nextTotalPowersBoxName},
    {appIndex: VAULT_APP_ID[network], name: slopeChangeBoxName}
  ];

  // contract will create weekly checkpoints automatically
  const newTotalPowerTimestamps = getNewTotalPowerTimestamps(
    vaultAppGlobalState.lastTotalPowerTimestamp,
    Date.now() / 1000
  );
  const newTotalPowerCount = newTotalPowerTimestamps.length;

  for (const timestamp of newTotalPowerTimestamps) {
    if (timestamp % WEEK === 0) {
      slopeChangeBoxName = getSlopeChangeBoxName(timestamp);

      boxes.push({appIndex: VAULT_APP_ID[network], name: slopeChangeBoxName});
    }
  }

  // Min Balance
  let minBalanceIncrease = 0;

  if (newTotalPowerCount > vaultAppGlobalState.freeTotalPowerSpaceCount) {
    minBalanceIncrease += TOTAL_POWER_BOX_COST;
  }

  if (!accountState.freeAccountPowerSpaceCount) {
    const newAccountPowerBoxName = getAccountPowerBoxName(
      sender,
      accountState.lastAccountPowerBoxIndex + 1
    );

    boxes.push({appIndex: VAULT_APP_ID[network], name: newAccountPowerBoxName});
    minBalanceIncrease += ACCOUNT_POWER_BOX_COST;
  }

  const txns = [
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      assetIndex: TINY_ASSET_ID[network],
      sender,
      receiver: algosdk.getApplicationAddress(VAULT_APP_ID[network]),
      amount: lockedAmount,
      suggestedParams
    }),
    algosdk.makeApplicationNoOpTxnFromObject({
      appIndex: VAULT_APP_ID[network],
      sender,
      suggestedParams,
      appArgs: [encodeString("increase_lock_amount")],
      boxes,
      note: appCallNote
    }),
    prepareBudgetIncreaseTxn({
      sender,
      suggestedParams,
      index: VAULT_APP_ID[network]
    })
  ];

  if (minBalanceIncrease) {
    const minimumBalancePayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: algosdk.getApplicationAddress(VAULT_APP_ID[network]),
      amount: minBalanceIncrease,
      suggestedParams
    });

    txns.unshift(minimumBalancePayment);
  }

  const txnGroup = algosdk.assignGroupID(txns);

  return txnGroup;
}

function prepareExtendLockEndTimeTransactions({
  accountState,
  network,
  newLockEndTime,
  slopeChangeAtNewLockEndTime,
  sender,
  vaultAppGlobalState,
  suggestedParams,
  appCallNote
}: {
  network: SupportedNetwork;
  sender: string;
  newLockEndTime: number;
  vaultAppGlobalState: VaultAppGlobalState;
  accountState: AccountState;
  slopeChangeAtNewLockEndTime?: number;
  suggestedParams: SuggestedParams;
  appCallNote?: Uint8Array;
}) {
  if (newLockEndTime % WEEK) {
    throw new Error("Invalid lock end time");
  }

  if (newLockEndTime <= accountState.lockEndTime) {
    throw new Error("New lock end time must be greater than current lock end time");
  }

  // Boxes
  const accountStateBoxName = getAccountStateBoxName(sender);
  const accountPowerBoxName = getAccountPowerBoxName(
    sender,
    accountState.lastAccountPowerBoxIndex
  );
  const totalPowersBoxName = getTotalPowerBoxName(
    vaultAppGlobalState.lastTotalPowerBoxIndex
  );
  const nextTotalPowersBoxName = getTotalPowerBoxName(
    vaultAppGlobalState.lastTotalPowerBoxIndex + 1
  );
  const currentAccountSlopeChangeBoxName = getSlopeChangeBoxName(
    accountState.lockEndTime
  );
  const newAccountSlopeChangeBoxName = getSlopeChangeBoxName(newLockEndTime);

  const boxes: algosdk.BoxReference[] = [
    {appIndex: VAULT_APP_ID[network], name: accountStateBoxName},
    {appIndex: VAULT_APP_ID[network], name: accountPowerBoxName},
    {appIndex: VAULT_APP_ID[network], name: totalPowersBoxName},
    {appIndex: VAULT_APP_ID[network], name: nextTotalPowersBoxName},
    {appIndex: VAULT_APP_ID[network], name: currentAccountSlopeChangeBoxName},
    {appIndex: VAULT_APP_ID[network], name: newAccountSlopeChangeBoxName}
  ];

  if (!accountState.freeAccountPowerSpaceCount) {
    const newAccountPowerBoxName = getAccountPowerBoxName(
      sender,
      accountState.lastAccountPowerBoxIndex + 1
    );

    boxes.push({appIndex: VAULT_APP_ID[network], name: newAccountPowerBoxName});
  }

  // contract will create weekly checkpoints automatically
  const newTotalPowerTimestamps = getNewTotalPowerTimestamps(
    vaultAppGlobalState.lastTotalPowerTimestamp,
    Math.floor(Date.now() / 1000)
  );
  const newTotalPowerCount = newTotalPowerTimestamps.length;

  for (const timestamp of newTotalPowerTimestamps) {
    if (timestamp % WEEK === 0) {
      const slopeChangeBoxName = getSlopeChangeBoxName(timestamp);

      boxes.push({appIndex: VAULT_APP_ID[network], name: slopeChangeBoxName});
    }
  }

  // Min Balance
  let minBalanceIncrease = 0;

  if (!slopeChangeAtNewLockEndTime) {
    minBalanceIncrease += SLOPE_CHANGE_BOX_COST;
  }

  if (!accountState.freeAccountPowerSpaceCount) {
    minBalanceIncrease += ACCOUNT_POWER_BOX_COST;
  }

  if (newTotalPowerCount > vaultAppGlobalState.freeTotalPowerSpaceCount) {
    minBalanceIncrease += TOTAL_POWER_BOX_COST;
  }

  const txns = [
    algosdk.makeApplicationNoOpTxnFromObject({
      appIndex: VAULT_APP_ID[network],
      sender,
      suggestedParams,
      appArgs: [encodeString("extend_lock_end_time"), intToBytes(newLockEndTime)],
      boxes: boxes.slice(0, 8),
      note: appCallNote
    }),
    prepareBudgetIncreaseTxn({
      sender,
      suggestedParams,
      index: VAULT_APP_ID[network],
      boxes: boxes.slice(8)
    })
  ];

  if (minBalanceIncrease) {
    const minimumBalancePayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: algosdk.getApplicationAddress(VAULT_APP_ID[network]),
      amount: minBalanceIncrease,
      suggestedParams
    });

    txns.unshift(minimumBalancePayment);
  }

  const txnGroup = algosdk.assignGroupID(txns);

  return txnGroup;
}

function prepareWithdrawTransactions({
  accountState,
  network,
  sender,
  suggestedParams,
  appCallNote
}: {
  network: SupportedNetwork;
  client: Algodv2;
  sender: string;
  accountState: AccountState;
  suggestedParams: SuggestedParams;
  appCallNote?: Uint8Array;
}) {
  // Boxes
  const accountStateBoxName = getAccountStateBoxName(sender);
  const accountPowerBoxName = getAccountPowerBoxName(
    sender,
    accountState.lastAccountPowerBoxIndex
  );
  const nextAccountPowerBoxName = getAccountPowerBoxName(
    sender,
    accountState.lastAccountPowerBoxIndex + 1
  );
  const boxes: algosdk.BoxReference[] = [
    {appIndex: VAULT_APP_ID[network], name: accountStateBoxName},
    {appIndex: VAULT_APP_ID[network], name: accountPowerBoxName},
    {appIndex: VAULT_APP_ID[network], name: nextAccountPowerBoxName}
  ];

  const withdrawTxn = algosdk.makeApplicationNoOpTxnFromObject({
    appIndex: VAULT_APP_ID[network],
    sender,
    suggestedParams,
    appArgs: [encodeString("withdraw")],
    foreignAssets: [TINY_ASSET_ID[network]],
    boxes,
    note: appCallNote
  });

  withdrawTxn.fee *= 2n;

  const txns = [withdrawTxn];

  // Min Balance
  if (!accountState.freeAccountPowerSpaceCount) {
    const minBalancePaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: algosdk.getApplicationAddress(VAULT_APP_ID[network]),
      amount: ACCOUNT_POWER_BOX_COST,
      suggestedParams
    });

    txns.unshift(minBalancePaymentTxn);
  }

  const txnGroup = algosdk.assignGroupID(txns);

  return txnGroup;
}

export {
  prepareCreateLockTransactions,
  prepareIncreaseLockAmountTransactions,
  prepareExtendLockEndTimeTransactions,
  prepareWithdrawTransactions
};
