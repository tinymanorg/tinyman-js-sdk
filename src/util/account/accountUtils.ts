import algosdk, {Algodv2, modelsv2} from "algosdk";
import {fromByteArray, toByteArray} from "base64-js";

import {V1PoolInfo} from "../pool/poolTypes";
import {
  BASE_MINIMUM_BALANCE,
  MINIMUM_BALANCE_REQUIRED_PER_APP,
  MINIMUM_BALANCE_REQUIRED_PER_ASSET,
  MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA,
  MINIMUM_BALANCE_REQUIRED_PER_CREATED_APP,
  MINIMUM_BALANCE_REQUIRED_PER_EXTRA_APP_PAGE,
  MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE
} from "../constant";
import {decodeState, encodeString, joinByteArrays} from "../util";
import {
  AccountExcessWithinPool,
  AccountInformationData,
  AccountExcess
} from "./accountTypes";
import {ContractVersionValue} from "../../contract/types";
import {getContract} from "../../contract";

export function getAccountInformation(
  client: Algodv2,
  address: string | algosdk.Address
) {
  return new Promise<AccountInformationData>(async (resolve, reject) => {
    try {
      const accountInfo = await client.accountInformation(address).do();

      resolve({
        ...accountInfo,
        minimum_required_balance: calculateAccountMinimumRequiredBalance(accountInfo)
      } as AccountInformationData);
    } catch (error: any) {
      reject(new Error(error.message || "Failed to fetch account information"));
    }
  });
}

/**
 * @returns the decoded application local state object (both keys and values are decoded)
 */
export function getDecodedAccountApplicationLocalState(
  accountInfo: AccountInformationData,
  validatorAppID: number
) {
  const appState = accountInfo.appsLocalState?.find(
    (app) => app.id === BigInt(validatorAppID)
  );

  if (!appState) {
    return null;
  }

  const keyValue = appState.keyValue || [];
  const decodedState = decodeState({stateArray: keyValue, shouldDecodeKeys: true});

  return decodedState;
}

export function calculateAccountMinimumRequiredBalance(
  account: modelsv2.Account
): bigint {
  const totalSchema = account.appsTotalSchema;

  return BigInt(
    BASE_MINIMUM_BALANCE +
      MINIMUM_BALANCE_REQUIRED_PER_ASSET * (account.assets || []).length +
      MINIMUM_BALANCE_REQUIRED_PER_CREATED_APP * (account.createdApps || []).length +
      MINIMUM_BALANCE_REQUIRED_PER_APP * (account.appsLocalState || []).length +
      MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA *
        Number((totalSchema && totalSchema.numByteSlice) || 0) +
      MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE *
        Number((totalSchema && totalSchema.numUint) || 0) +
      MINIMUM_BALANCE_REQUIRED_PER_EXTRA_APP_PAGE * (account.appsTotalExtraPages || 0)
  );
}

export function hasSufficientMinimumBalance(accountData: AccountInformationData) {
  return accountData.amount >= accountData.minimum_required_balance;
}

const EXCESS_ENCODED = encodeString("e");

/**
 * Finds the excess amounts accumulated for an account within a pool
 * @param params.client An Algodv2 client.
 * @param params.pool Pool info.
 * @param params.validatorAppID Validator APP ID
 * @returns The excess amounts accumulated for an account within the pool
 */
export async function getAccountExcessWithinPool({
  client,
  pool,
  accountAddr
}: {
  client: Algodv2;
  pool: V1PoolInfo;
  accountAddr: string;
}): Promise<AccountExcessWithinPool> {
  const info = await client.accountInformation(accountAddr).do();

  const appsLocalState = info.appsLocalState || [];

  let excessAsset1 = 0n;
  let excessAsset2 = 0n;
  let excessPoolTokens = 0n;

  const poolAddress = pool.account.address();

  for (const app of appsLocalState) {
    if (app.id != BigInt(pool.validatorAppID)) {
      continue;
    }

    const {keyValue} = app;

    if (!keyValue) {
      break;
    }

    const state = decodeState({stateArray: keyValue});

    const excessAsset1Key = fromByteArray(
      joinByteArrays([
        poolAddress.publicKey,
        EXCESS_ENCODED,
        algosdk.encodeUint64(pool.asset1ID)
      ])
    );
    const excessAsset2Key = fromByteArray(
      joinByteArrays([
        poolAddress.publicKey,
        EXCESS_ENCODED,
        algosdk.encodeUint64(pool.asset2ID)
      ])
    );
    const excessPoolTokenKey = fromByteArray(
      joinByteArrays([
        poolAddress.publicKey,
        EXCESS_ENCODED,
        algosdk.encodeUint64(pool.poolTokenID!)
      ])
    );

    const excessAsset1Value = state[excessAsset1Key];
    const excessAsset2Value = state[excessAsset2Key];
    const excessPoolTokenValue = state[excessPoolTokenKey];

    if (typeof excessAsset1Value === "bigint") {
      excessAsset1 = excessAsset1Value;
    }

    if (typeof excessAsset2Value === "bigint") {
      excessAsset2 = excessAsset2Value;
    }

    if (typeof excessPoolTokenValue === "bigint") {
      excessPoolTokens = excessPoolTokenValue;
    }
  }

  const excessAssets = {
    excessAsset1,
    excessAsset2,
    excessPoolTokens
  };

  if (
    excessAssets.excessAsset1 < 0n ||
    excessAssets.excessAsset2 < 0n ||
    excessAssets.excessPoolTokens < 0n
  ) {
    throw new Error(`Invalid account excess: ${excessAssets}`);
  }

  return excessAssets;
}

/**
 * Generates a list of excess amounts accumulated within an account.
 * @param params.client An Algodv2 client.
 * @param params.accountAddr The address of the account.
 * @param params.validatorAppID Validator APP ID
 * @returns List of excess amounts
 */
export async function getAccountExcess({
  client,
  accountAddr,
  validatorAppID
}: {
  client: Algodv2;
  accountAddr: string;
  validatorAppID: bigint;
}) {
  const info = await client.accountInformation(accountAddr).do();

  const appsLocalState = info.appsLocalState || [];
  const appState = appsLocalState.find(
    // `==` is used here to coerce bigints if necessary
    (appLocalState) => appLocalState.id == validatorAppID
  );
  let excessData: AccountExcess[] = [];

  if (appState && appState.keyValue) {
    const state = decodeState({stateArray: appState.keyValue});

    for (let entry of Object.entries(state)) {
      const [key, value] = entry;
      const decodedKey = toByteArray(key);

      if (decodedKey.length === 41 && decodedKey[32] === 101) {
        excessData.push({
          poolAddress: algosdk.encodeAddress(decodedKey.slice(0, 32)),
          assetID: algosdk.decodeUint64(decodedKey.slice(33, 41), "safe"),
          amount: parseInt(value.toString())
        });
      }
    }
  }

  return excessData;
}

/**
 * Checks if an account is opted into an app.
 *
 * @param params.appID The ID of the App.
 * @param params.accountAppsLocalState Array of app local states for an account.
 * @returns True if and only if the indicated account has opted into the App.
 */
export function isAccountOptedIntoApp({
  appID,
  accountAppsLocalState
}: {
  appID: bigint;
  accountAppsLocalState: modelsv2.ApplicationLocalState[];
}): boolean {
  return accountAppsLocalState.some((appState) => appState.id === appID);
}

/**
 * @returns the minimum balance required to opt in to an app or asset (decided by `type`)
 */
export function getMinRequiredBalanceToOptIn(
  params: (
    | {
        type: "app-opt-in";
        contractVersion: ContractVersionValue;
      }
    | {
        type: "asset-opt-in";
      }
  ) & {
    currentMinumumBalanceForAccount: number;
    suggestedTransactionFee?: number;
  }
) {
  const {currentMinumumBalanceForAccount, suggestedTransactionFee} = params;

  let minBalanceRequirementPerOptIn: number;

  if (params.type === "app-opt-in") {
    const contract = getContract(params.contractVersion);

    minBalanceRequirementPerOptIn =
      MINIMUM_BALANCE_REQUIRED_PER_APP +
      contract.schema.numLocalByteSlices * MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA +
      contract.schema.numLocalInts * MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE;
  } else {
    minBalanceRequirementPerOptIn = MINIMUM_BALANCE_REQUIRED_PER_ASSET;
  }

  return (
    minBalanceRequirementPerOptIn +
    (currentMinumumBalanceForAccount || 0) +
    (suggestedTransactionFee || 0)
  );
}
