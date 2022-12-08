import {waitForConfirmation} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {SignerTransaction} from "../commonTypes";
import {DEFAULT_WAIT_FOR_CONFIRMATION_ROUNDS} from "../constant";

/**
 * Tries to find the app call transaction in the group, get the response, and extract the inner txns data.
 * @returns the innter transactions of the app call transaction or `undefined` if no app call transaction was found.
 */
export async function getAppCallInnerTxns(
  client: AlgodClient,
  txGroup: SignerTransaction[]
): Promise<{txn: {txn: {xaid: number; aamt: number; type: string}}}[] | undefined> {
  const appCallTxnId = txGroup.find(({txn}) => txn.type === "appl")?.txn.txID();
  const appCallTxnResponse = appCallTxnId
    ? await waitForConfirmation(
        client,
        appCallTxnId,
        DEFAULT_WAIT_FOR_CONFIRMATION_ROUNDS
      )
    : undefined;

  return appCallTxnResponse?.["inner-txns"];
}
