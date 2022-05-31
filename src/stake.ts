import {
  Algodv2,
  assignGroupID,
  encodeUint64,
  makeApplicationNoOpTxnFromObject,
  SuggestedParams
} from "algosdk";

import {SignerTransaction, SupportedNetwork} from "./util/commonTypes";
import {encodeString, joinByteArrays} from "./util/util";

interface CreateCommitTxnOptions {
  suggestedParams: SuggestedParams;
  stakingAppID: number;
  initiatorAddr: string;
  liquidityAssetID: number;
  program: {
    accountAddress: string;
    id: number;
  };
  amount: number | bigint;
}

function createCommitTxnWithSuggestedParams({
  suggestedParams,
  stakingAppID,
  initiatorAddr,
  liquidityAssetID,
  program,
  amount
}: CreateCommitTxnOptions) {
  const amountEncoded = encodeUint64(amount);
  const programIdEncoded = encodeUint64(program.id);

  return makeApplicationNoOpTxnFromObject({
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
  });
}

async function prepareCommitTransactions({
  client,
  stakingAppID,
  program,
  requiredAssetID,
  liquidityAssetID,
  amount,
  initiatorAddr
}: Omit<CreateCommitTxnOptions, "suggestedParams"> & {
  client: Algodv2;
  requiredAssetID?: number;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const commitTxn = createCommitTxnWithSuggestedParams({
    suggestedParams,
    stakingAppID,
    program,
    liquidityAssetID,
    initiatorAddr,
    amount
  });

  let txnGroup = [commitTxn];

  if (typeof requiredAssetID === "number") {
    const logBalanceTxn = makeApplicationNoOpTxnFromObject({
      appIndex: stakingAppID,
      from: initiatorAddr,
      suggestedParams,
      foreignAssets: [requiredAssetID],
      accounts: [program.accountAddress],
      appArgs: [encodeString("log_balance")]
    });

    txnGroup = assignGroupID([commitTxn, logBalanceTxn]);

    return [
      {
        txn: txnGroup[0],
        signers: [initiatorAddr]
      },
      {
        txn: txnGroup[1],
        signers: [initiatorAddr]
      }
    ];
  }

  return [
    {
      txn: txnGroup[0],
      signers: [initiatorAddr]
    }
  ];
}

function getStakingAppID(network: SupportedNetwork) {
  return network === "testnet" ? 51948952 : 649588853;
}

export {prepareCommitTransactions, getStakingAppID};
