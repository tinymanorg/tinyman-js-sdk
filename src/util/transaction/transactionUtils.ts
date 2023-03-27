import {
  Algodv2,
  assignGroupID,
  decodeUnsignedTransaction,
  encodeUnsignedTransaction,
  TransactionType,
  waitForConfirmation
} from "algosdk";

import {ALGO_ASSET_ID} from "../asset/assetConstants";
import {AssetWithIdAndAmount} from "../asset/assetModels";
import {SignerTransaction, TxnResponseInnerTxns} from "../commonTypes";
import {DEFAULT_WAIT_FOR_CONFIRMATION_ROUNDS} from "../constant";

export async function getAppCallTxnResponse(
  client: Algodv2,
  txGroup: SignerTransaction[]
) {
  const appCallTxnId = txGroup.find(({txn}) => txn.type === "appl")?.txn.txID();
  const appCallTxnResponse = appCallTxnId
    ? await waitForConfirmation(
        client,
        appCallTxnId,
        DEFAULT_WAIT_FOR_CONFIRMATION_ROUNDS
      )
    : undefined;

  return appCallTxnResponse;
}

/**
 * Tries to find the app call transaction in the group, get the response, and extract the inner txns data.
 * @returns the innter transactions of the app call transaction or `undefined` if no app call transaction was found.
 */
export async function getAppCallInnerTxns(
  client: Algodv2,
  txGroup: SignerTransaction[]
): Promise<TxnResponseInnerTxns | undefined> {
  const txResponse = await getAppCallTxnResponse(client, txGroup);

  return txResponse?.["inner-txns"];
}

/**
 * Tries to find the asset related (asset transfer / payment (i.e. ALGO transfer))
 * inner transactions in the app call, and return the extracted asset data.
 * Useful for getting the asset data after an "execute" operation.
 */
export async function getAppCallInnerAssetData(
  client: Algodv2,
  txGroup: SignerTransaction[]
): Promise<AssetWithIdAndAmount[] | undefined> {
  const innerTxns = await getAppCallInnerTxns(client, txGroup);

  return innerTxns?.reduce<AssetWithIdAndAmount[]>((assets, {txn}) => {
    let updatedAssets = assets;
    const {txn: innerTxn} = txn;

    if (innerTxn.type === TransactionType.axfer) {
      updatedAssets.push({
        id: innerTxn.xaid,
        amount: innerTxn.aamt
      });
    } else if (innerTxn.type === TransactionType.pay) {
      updatedAssets.push({
        // Payment transactions are always in ALGO
        id: ALGO_ASSET_ID,
        amount: innerTxn.amt
      });
    }

    return updatedAssets;
  }, []);
}

/**
 * Combines the provided signer transaction groups into one signer transaction group, with a new group ID
 * @param signerTransactions - The signer transaction groups to combine
 * @returns the combined signer transaction groups, with a new assigned group ID
 */
export function combineAndRegroupSignerTxns(
  ...signerTransactions: SignerTransaction[][]
): SignerTransaction[] {
  const flattenedOldSignerTxns = signerTransactions.flat();

  // Remove the group data from the transactions
  const degroupedTxns = flattenedOldSignerTxns.map(({txn}) => {
    txn.group = undefined;

    /**
     * We do first encode and then decode, to make sure it's still an instance of Transaction
     * Otherwise, algosdk will try to create a new instance of Transaction,
     * and that will cause an error ("malformed address")
     */
    return decodeUnsignedTransaction(encodeUnsignedTransaction(txn));
  });

  // Assign a new group ID to the combined transactions
  const newTxnGroup = assignGroupID(degroupedTxns);

  return flattenedOldSignerTxns.map((signerTxn, index) => ({
    ...signerTxn,
    // Replace the old transaction, with the new transaction that has the new group ID
    txn: newTxnGroup[index]
  }));
}
