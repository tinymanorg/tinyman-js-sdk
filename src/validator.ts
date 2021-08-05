import assert from "assert";
import algosdk from "algosdk";

import {
  validatorApprovalContract,
  validatorClearStateContract,
  VALIDATOR_APP_SCHEMA
} from "./contracts";
import {waitForTransaction} from "./util";
import {AccountInformationData, InitiatorSigner} from "./common-types";

import {
  TESTNET_VALIDATOR_APP_ID,
  HIPONET_VALIDATOR_APP_ID,
  MAINNET_VALIDATOR_APP_ID
} from "./constant";

const CREATE_ENCODED = Uint8Array.from([99, 114, 101, 97, 116, 101]); // 'create'

/**
 * Get the Validator App ID for a network.
 *
 * @param client An Algodv2 client.
 *
 * @returns A Promise that resolves to the Validator App ID for the network that client is connected
 *   to.
 */
export async function getvalidatorAppID(client: any): Promise<number> {
  const params = await client.getTransactionParams().do();
  const genesisHash: string = params["genesis-hash"];
  const genesisID: string = params["genesis-id"];

  if (
    genesisID === "mainnet-v1.0" &&
    genesisHash === "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
  ) {
    return MAINNET_VALIDATOR_APP_ID;
  }

  if (
    genesisID === "testnet-v1.0" &&
    genesisHash === "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
  ) {
    return TESTNET_VALIDATOR_APP_ID;
  }

  if (
    genesisID === "hiponet-v1" &&
    genesisHash === "1Ok6UoiCtb3ppI8rWSXxB3ddULOkqugfCB4FGcPFkpE="
  ) {
    return HIPONET_VALIDATOR_APP_ID;
  }

  throw new Error(`No Validator App exists for network ${genesisID}`);
}

/**
 * Opt into the validator app.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.initiatorAddr The address of the account opting in.
 * @param params.initiatorSigner A function that will sign  transactions from the initiator's
 *   account.
 */
export async function optIntoValidator({
  client,
  validatorAppID,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  validatorAppID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<void> {
  const suggestedParams = await client.getTransactionParams().do();

  const appOptInTxn = algosdk.makeApplicationOptInTxnFromObject({
    from: initiatorAddr,
    appIndex: validatorAppID!,
    suggestedParams
  });

  const [signedTxn] = await initiatorSigner([appOptInTxn]);

  const {txId} = await client.sendRawTransaction(signedTxn).do();

  await waitForTransaction(client, txId);
}

/**
 * Close out of the Validator app. WARNING: Make sure to redeem ALL excess asset amounts
 * before closing out of the validator, otherwise those assets will be returned to Pools.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.initiatorAddr The address of the account closing out.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function optOutOfValidator({
  client,
  validatorAppID,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  validatorAppID: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<void> {
  const suggestedParams = await client.getTransactionParams().do();

  const appClearStateTxn = algosdk.makeApplicationClearStateTxnFromObject({
    from: initiatorAddr,
    appIndex: validatorAppID,
    suggestedParams
  });

  const [signedTxn] = await initiatorSigner([appClearStateTxn]);

  const {txId} = await client.sendRawTransaction(signedTxn).do();

  await waitForTransaction(client, txId);
}

/**
 * Checks if an account is opted into the Validator app.
 *
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.accountAppsLocalState Array of app local states for an account.
 * @returns True if and only if the indicated account has opted into the Validator App.
 */
export function isOptedIntoValidator({
  validatorAppID,
  accountAppsLocalState
}: {
  validatorAppID: number;
  accountAppsLocalState: AccountInformationData["apps-local-state"];
}): boolean {
  return accountAppsLocalState.some((appState) => appState.id === validatorAppID);
}
