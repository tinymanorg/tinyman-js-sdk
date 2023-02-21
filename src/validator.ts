import algosdk, {Algodv2} from "algosdk";

import {tinymanJSSDKConfig} from "./config";
import {CONTRACT_VERSION} from "./contract/constants";
import {ContractVersionValue} from "./contract/types";
import {SignerTransaction, SupportedNetwork} from "./util/commonTypes";

export const OPT_IN_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;

export const VALIDATOR_APP_ID: Record<
  ContractVersionValue,
  Record<SupportedNetwork, number>
> = {
  [CONTRACT_VERSION.V1_1]: {
    testnet: 62368684,
    mainnet: 552635992
  },
  [CONTRACT_VERSION.V2]: {
    testnet: 148607000,
    mainnet: 1002541853
  }
};

/**
 * Get the Validator App ID for a network.
 *
 * @param {SupportedNetwork} network "mainnet" | "testnet".
 * @param {ContractVersion} version contract version.
 * @returns the Validator App ID
 */
export function getValidatorAppID(
  network: SupportedNetwork,
  contractVersion: ContractVersionValue
): number {
  const id = VALIDATOR_APP_ID[contractVersion][network];

  if (!id) {
    throw new Error(
      `No Validator App exists for ${network} network with ${contractVersion} contract version`
    );
  }

  return id;
}

export async function generateOptIntoValidatorTxns({
  client,
  network,
  contractVersion,
  initiatorAddr
}: {
  client: Algodv2;
  network: SupportedNetwork;
  contractVersion: ContractVersionValue;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const appOptInTxn = algosdk.makeApplicationOptInTxnFromObject({
    from: initiatorAddr,
    appIndex: getValidatorAppID(network, contractVersion),
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(contractVersion),
    suggestedParams
  });

  return [{txn: appOptInTxn, signers: [initiatorAddr]}];
}

export const OPT_OUT_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;

export async function generateOptOutOfValidatorTxns({
  client,
  network,
  contractVersion,
  initiatorAddr
}: {
  client: Algodv2;
  network: SupportedNetwork;
  contractVersion: ContractVersionValue;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const appClearStateTxn = algosdk.makeApplicationClearStateTxnFromObject({
    from: initiatorAddr,
    appIndex: getValidatorAppID(network, contractVersion),
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(contractVersion),
    suggestedParams
  });

  return [{txn: appClearStateTxn, signers: [initiatorAddr]}];
}
