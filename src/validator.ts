import algosdk, {Algodv2} from "algosdk";

import {SignerTransaction, SupportedNetwork} from "./util/commonTypes";

export const OPT_IN_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;

const VALIDATOR_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 62368684,
  mainnet: 552635992
};

/**
 * Get the Validator App ID for a network.
 *
 * @param network "mainnet" | "testnet".
 *
 * @returns the Validator App ID
 */
export function getValidatorAppID(network: SupportedNetwork): number {
  const id = VALIDATOR_APP_ID[network];

  if (!id) {
    throw new Error(`No Validator App exists for network ${network}`);
  }

  return id;
}

export async function generateOptIntoValidatorTxns({
  client,
  validatorAppID,
  initiatorAddr
}: {
  client: Algodv2;
  validatorAppID: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const appOptInTxn = algosdk.makeApplicationOptInTxnFromObject({
    from: initiatorAddr,
    appIndex: validatorAppID,
    suggestedParams
  });

  return [{txn: appOptInTxn, signers: [initiatorAddr]}];
}

export const OPT_OUT_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;

export async function generateOptOutOfValidatorTxns({
  client,
  validatorAppID,
  initiatorAddr
}: {
  client: Algodv2;
  validatorAppID: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const appClearStateTxn = algosdk.makeApplicationClearStateTxnFromObject({
    from: initiatorAddr,
    appIndex: validatorAppID,
    suggestedParams
  });

  return [{txn: appClearStateTxn, signers: [initiatorAddr]}];
}
