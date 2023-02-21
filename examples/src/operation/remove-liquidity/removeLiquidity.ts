import {poolUtils, RemoveLiquidity, SupportedNetwork} from "@tinymanorg/tinyman-js-sdk";
import {Account} from "algosdk";

import {getOwnedAssetAmount} from "../../util/account";
import {algodClient} from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";

/**
 * Removes a portion of owned liquidity from a pool
 */
export async function removeLiquidity({
  account,
  asset_1,
  asset_2
}: {
  account: Account;
  asset_1: {id: string; unit_name: string};
  asset_2: {id: string; unit_name: string};
}) {
  const initiatorAddr = account.addr;
  const poolInfo = await poolUtils.v2.getPoolInfo({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    asset1ID: Number(asset_1.id),
    asset2ID: Number(asset_2.id)
  });
  const poolReserves = await poolUtils.v2.getPoolReserves(algodClient, poolInfo);

  // Get the owned pool token amount, so we can decide how much to remove
  const ownedPoolTokenAssetAmount = await getOwnedAssetAmount(
    initiatorAddr,
    poolInfo.poolTokenID!
  );

  /**
   * For testing purposes, we will remove 1/4 of the owned pool tokens,
   * it can be any amount that is lower than the owned amount
   */
  const poolTokenAmountToBeRemoved = Math.floor(ownedPoolTokenAssetAmount / 4);

  // Get a quote for the desired removal amount
  const quote = RemoveLiquidity.v2.getQuote({
    pool: poolInfo,
    reserves: poolReserves,
    poolTokenIn: poolTokenAmountToBeRemoved
  });

  const removeLiquidityTxns = await RemoveLiquidity.v2.generateTxns({
    client: algodClient,
    pool: poolInfo,
    initiatorAddr,
    poolTokenIn: quote.poolTokenIn.amount,
    minAsset1Amount: quote.asset1Out.amount,
    minAsset2Amount: quote.asset2Out.amount,
    slippage: 0.05
  });

  const signedTxns = await RemoveLiquidity.v2.signTxns({
    txGroup: removeLiquidityTxns,
    initiatorSigner: signerWithSecretKey(account)
  });

  const executionResponse = await RemoveLiquidity.v2.execute({
    client: algodClient,
    txGroup: removeLiquidityTxns,
    signedTxns
  });

  console.log("✅ Remove Liquidity executed successfully!");
  console.log({
    outputAssets: JSON.stringify(executionResponse.outputAssets),
    txnID: executionResponse.txnID
  });
}
