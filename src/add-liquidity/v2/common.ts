import {Algodv2} from "algosdk";

import {AssetWithIdAndAmount} from "../../util/asset/assetModels";
import {InitiatorSigner, SignerTransaction} from "../../util/commonTypes";
import TinymanError from "../../util/error/TinymanError";
import {V2PoolInfo} from "../../util/pool/poolTypes";
import {getAppCallInnerAssetData} from "../../util/transaction/transactionUtils";
import {getTxnGroupID, sendAndWaitRawTransaction, sumUpTxnFees} from "../../util/util";
import {V2AddLiquidityExecution} from "./types";

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
 * Execute an add liquidity operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.txGroup The transaction group to execute.
 */
export async function execute({
  client,
  pool,
  txGroup,
  signedTxns
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
}): Promise<V2AddLiquidityExecution> {
  try {
    const [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [
      signedTxns
    ]);

    let assetOut: AssetWithIdAndAmount | undefined;

    try {
      assetOut = (await getAppCallInnerAssetData(client, txGroup))?.find(
        // Output asset is the pool token for add liquidity
        ({id}) => id === pool.poolTokenID
      );
    } catch (_error) {
      // We can ignore this error since the main execution was successful
    }

    return {
      round: confirmedRound,
      assetOut,
      fees: sumUpTxnFees(txGroup),
      poolTokenID: pool.poolTokenID!,
      txnID,
      groupID: getTxnGroupID(txGroup)
    };
  } catch (error: any) {
    const parsedError = new TinymanError(
      error,
      "We encountered something unexpected while adding liquidity. Try again later."
    );

    if (parsedError.type === "SlippageTolerance") {
      parsedError.setMessage(
        "Adding liquidity failed due to too much slippage in the price. Please adjust the slippage tolerance and try again."
      );
    }

    throw parsedError;
  }
}
