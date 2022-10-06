import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {MINT_APP_ARGUMENT, MINT_FLEXIBLE_MODE_APP_ARGUMENT} from "../ constants";
import {ContractVersion} from "../../contract/contract";
import {SupportedNetwork} from "../../util/commonTypes";
import {PoolInfo} from "../../util/pool/poolTypes";
import {isAlgo} from "../../util/util";
import {getValidatorAppID} from "../../validator";

export async function generateTxns({
  client,
  pool,
  network,
  poolAddress,
  asset_1,
  asset_2,
  liquidityToken,
  initiatorAddr
}: {
  client: AlgodClient;
  pool: PoolInfo;
  network: SupportedNetwork;
  poolAddress: string;
  asset_1: {id: number; amount: number | bigint};
  asset_2: {id: number; amount: number | bigint};
  liquidityToken: {id: number; amount: number | bigint};
  slippage: number;
  initiatorAddr: string;
}) {
  const suggestedParams = await client.getTransactionParams().do();
  const isAlgoPool = isAlgo(asset_2.id);
  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: pool.asset1ID,
    amount: asset_1.amount,
    suggestedParams
  });
  const asset2InTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: asset_2.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        assetIndex: pool.asset2ID,
        amount: asset_2.amount,
        suggestedParams
      });
  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: poolAddress,
    appIndex: getValidatorAppID(network, ContractVersion.V2),
    appArgs: [MINT_APP_ARGUMENT, MINT_FLEXIBLE_MODE_APP_ARGUMENT],
    accounts: [poolAddress],
    foreignAssets: isAlgoPool
      ? [pool.asset1ID, liquidityToken.id]
      : [pool.asset1ID, pool.asset2ID, liquidityToken.id],
    suggestedParams: {
      ...suggestedParams,
      // In addition to the AppCall txn, there will be two additional Inner Transactions.
      fee: 3 * suggestedParams.fee
    }
  });

  return [
    {
      txn: validatorAppCallTxn,
      signers: [initiatorAddr]
    },
    {
      txn: asset1InTxn,
      signers: [initiatorAddr]
    },
    {
      txn: asset2InTxn,
      signers: [initiatorAddr]
    }
  ];
}
