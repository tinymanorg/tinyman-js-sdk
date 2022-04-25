import {Algodv2, encodeUint64, makeApplicationNoOpTxnFromObject} from "algosdk";

import {SignerTransaction, SupportedNetwork} from "./util/commonTypes";
import {encodeString, joinByteArrays} from "./util/util";

async function prepareCommitTransactions({
  client,
  stakingAppID,
  initiatorAddr,
  liquidityAssetID,
  program,
  amount
}: {
  client: Algodv2;
  stakingAppID: number;
  initiatorAddr: string;
  liquidityAssetID: number;
  program: {
    accountAddress: string;
    id: number;
  };
  amount: number | bigint;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const amountEncoded = encodeUint64(amount);
  const programIdEncoded = encodeUint64(program.id);

  return [
    {
      txn: makeApplicationNoOpTxnFromObject({
        appIndex: stakingAppID,
        from: initiatorAddr,
        suggestedParams,
        foreignAssets: [liquidityAssetID],
        accounts: [program.accountAddress],
        appArgs: [encodeString("commit"), amountEncoded],
        note: joinByteArrays([
          encodeString("tinymanStaking/v1:b"),
          programIdEncoded,
          encodeUint64(liquidityAssetID),
          amountEncoded
        ])
      }),
      signers: [initiatorAddr]
    }
  ];
}

function getStakingAppID(network: SupportedNetwork) {
  return network === "testnet" ? 51948952 : 649588853;
}

export {prepareCommitTransactions, getStakingAppID};
