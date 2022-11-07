import {waitForConfirmation} from "algosdk";

import {InitiatorSigner, SignerTransaction} from "../../util/commonTypes";
import TinymanError from "../../util/error/TinymanError";
import {V2PoolInfo} from "../../util/pool/poolTypes";
import {getTxnGroupID, sendAndWaitRawTransaction, sumUpTxnFees} from "../../util/util";
import {V2MintExecution, V2MintTxnIndices, V2MintType} from "../types";

export function signTxns({
  txGroup,
  initiatorSigner
}: {
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  return initiatorSigner([txGroup]);
}

/**
 * Execute a mint operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.txGroup The transaction group to execute.
 * @param params.mode The mint mode.
 */
export async function execute({
  client,
  pool,
  txGroup,
  signedTxns,
  mode
}: {
  client: any;
  pool: V2PoolInfo;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
  mode: V2MintType;
}): Promise<V2MintExecution> {
  try {
    const [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [
      signedTxns
    ]);
    const appCallTxnId =
      txGroup[V2MintTxnIndices[mode].VALIDATOR_APP_CALL_TXN].txn.txID();
    // TODO: instead of 1000, use the const for wait rounds here
    const appCallTxnResponse = await waitForConfirmation(client, appCallTxnId, 1000);
    const assetOutInnerTxn = appCallTxnResponse["inner-txns"].find(
      (item) => item.txn.txn.type === "axfer"
    ).txn.txn;
    const fees = sumUpTxnFees(txGroup);
    const groupID = getTxnGroupID(txGroup);

    return {
      round: confirmedRound,
      // TODO: make sure returned data is correct
      assetOut: {
        amount: assetOutInnerTxn.aamt,
        assetID: assetOutInnerTxn.xaid
      },
      fees,
      liquidityID: pool.liquidityTokenID!,
      txnID,
      groupID
    };
  } catch (error: any) {
    const parsedError = new TinymanError(
      error,
      "We encountered something unexpected while minting liquidity. Try again later."
    );

    if (parsedError.type === "SlippageTolerance") {
      parsedError.setMessage(
        "Minting failed due to too much slippage in the price. Please adjust the slippage tolerance and try again."
      );
    }

    throw parsedError;
  }
}
