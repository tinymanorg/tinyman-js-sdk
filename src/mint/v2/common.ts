import {InitiatorSigner, SignerTransaction} from "../../util/commonTypes";
import TinymanError from "../../util/error/TinymanError";
import {V2PoolInfo} from "../../util/pool/poolTypes";
import {getTxnGroupID, sendAndWaitRawTransaction, sumUpTxnFees} from "../../util/util";
import {MintExecution} from "../types";

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
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.liquidityOut The quantity of liquidity tokens being withdrawn.
 * @param params.slippage The maximum acceptable slippage rate. Should be a number between 0 and 100
 *   and acts as a percentage of params.liquidityOut.
 * @param params.initiatorAddr The address of the account performing the mint operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function execute({
  client,
  pool,
  txGroup,
  signedTxns
}: {
  client: any;
  pool: V2PoolInfo;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
}): Promise<MintExecution> {
  try {
    const [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [
      signedTxns
    ]);
    const fees = sumUpTxnFees(txGroup);
    const groupID = getTxnGroupID(txGroup);

    return {
      round: confirmedRound,
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
