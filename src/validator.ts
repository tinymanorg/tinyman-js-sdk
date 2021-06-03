import assert from "assert";
import algosdk from "algosdk";
import {
  validatorApprovalContract,
  validatorClearStateContract,
  VALIDATOR_APP_SCHEMA
} from "algoswap-contracts-v1";

import {waitForTransaction} from "./util";
import {AccountInformationData, InitiatorSigner} from "./common-types";

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
    // TODO: return mainnet validator app ID
  }

  if (
    genesisID === "testnet-v1.0" &&
    genesisHash === "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
  ) {
    // TODO: return testnet validator app ID
  }

  if (
    genesisID === "betanet-v1.0" &&
    genesisHash === "mFgazF+2uRS1tMiL9dsj01hJGySEmPN28B/TjjvpVW0="
  ) {
    // TODO: return betanet validator app ID
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
export async function closeOutOfValidator({
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

  const appCloseOutTxn = algosdk.makeApplicationCloseOutTxnFromObject({
    from: initiatorAddr,
    appIndex: validatorAppID!,
    suggestedParams
  });

  const [signedTxn] = await initiatorSigner([appCloseOutTxn]);

  const {txId} = await client.sendRawTransaction(signedTxn).do();

  await waitForTransaction(client, txId);
}

/**
 * Check if an account is opted into the Validator app.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.account The address of the account to check.
 *
 * @returns A promise that resolve to true if and only if the indicated account has opted into the
 *   pool's pair app.
 */
export async function isOptedIntoValidator({
  client,
  validatorAppID,
  initiatorAddr
}: {
  client: any;
  validatorAppID: number;
  initiatorAddr: string;
}): Promise<boolean> {
  const info = (await client
    .accountInformation(initiatorAddr)
    .setIntDecoding("mixed")
    .do()) as AccountInformationData;
  const appsLocalState = info["apps-local-state"] || [];

  for (const app of appsLocalState) {
    if (app.id === validatorAppID) {
      return true;
    }
  }

  return false;
}

export async function getValidatorAppCreationTransaction(
  client: any,
  addr: string
): Promise<algosdk.Transaction> {
  const suggestedParams = await client.getTransactionParams().do();

  const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
    from: addr,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: validatorApprovalContract,
    clearProgram: validatorClearStateContract,
    numLocalInts: VALIDATOR_APP_SCHEMA.numLocalInts,
    numLocalByteSlices: VALIDATOR_APP_SCHEMA.numLocalByteSlices,
    numGlobalInts: VALIDATOR_APP_SCHEMA.numGlobalInts,
    numGlobalByteSlices: VALIDATOR_APP_SCHEMA.numGlobalByteSlices,
    appArgs: [CREATE_ENCODED],
    suggestedParams
  });

  return appCreateTxn;
}

export async function sendValidatorAppCreationTransaction(
  client: any,
  stx: any
): Promise<number> {
  const tx = await client.sendRawTransaction(stx).do();

  console.log("Signed transaction with txID: %s", tx.txId);
  const result = await waitForTransaction(client, tx.txId);
  const appID = result["application-index"];

  assert.ok(typeof appID === "number" && appID > 0);
  return appID;
}
