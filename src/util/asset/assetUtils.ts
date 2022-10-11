import algosdk from "algosdk";

import {SignerTransaction} from "../commonTypes";
import TinymanError from "../error/TinymanError";

export async function generateOptIntoAssetTxns({
  client,
  assetID,
  initiatorAddr
}): Promise<SignerTransaction[]> {
  try {
    const suggestedParams = await client.getTransactionParams().do();

    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: initiatorAddr,
      assetIndex: assetID,
      amount: 0,
      suggestedParams
    });

    return [{txn: optInTxn, signers: [initiatorAddr]}];
  } catch (error: any) {
    throw new TinymanError(
      error,
      "We encountered something unexpected while opting into this asset. Try again later."
    );
  }
}

/**
 * @returns the ordered version of the given list in ascending order with respect to asset id
 */
export function orderByAssetId<Data extends {id: string}>(list: Data[]) {
  return [...list].sort((item1, item2) => Number(item2.id) - Number(item1.id));
}
