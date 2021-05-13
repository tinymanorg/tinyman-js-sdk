import algosdk, { Algodv2 } from "algosdk";
import { waitForTransaction } from "./util";

export async function optIntoAssetIfNecessary({
  client,
  assetID,
  initiatorAddr,
  initiatorSigner,
}: {
  client: Algodv2;
  assetID: number;
  initiatorAddr: string;
  initiatorSigner: (txns: any[], index: number) => Promise<Uint8Array>;
}): Promise<void> {
  const account = await client.accountInformation(initiatorAddr).do();

  if (!account.assets.some((asset: any) => asset.id === assetID)) {
    const suggestedParams = await client.getTransactionParams().do();

    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: initiatorAddr,
      assetIndex: assetID,
      amount: 0,
      suggestedParams,
    });

    const signedTxn = await initiatorSigner([optInTxn], 0);

    const { txId } = await client.sendRawTransaction(signedTxn).do();

    await waitForTransaction(client, txId);
  }
}
