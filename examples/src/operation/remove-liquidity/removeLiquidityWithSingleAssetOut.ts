import {poolUtils, RemoveLiquidity, SupportedNetwork} from "@tinymanorg/tinyman-js-sdk";
import {Account} from "algosdk";

import {getOwnedAssetAmount} from "../../util/account";
import {algodClient} from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";

/**
 * Removes a portion of owned liquidity from a pool, with a single asset as output
 */
export async function removeLiquidityWithSingleAssetOut({
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
  const quote = RemoveLiquidity.v2.getSingleAssetRemoveLiquidityQuote({
    pool: poolInfo,
    reserves: poolReserves,
    poolTokenIn: poolTokenAmountToBeRemoved,
    // We inform SDK that we want to receive asset1 as output
    assetOutID: poolInfo.asset1ID,
    decimals: {assetIn: 6, assetOut: 6}
  });

  const removeLiquidityTxns = await RemoveLiquidity.v2.generateSingleAssetOutTxns({
    client: algodClient,
    pool: poolInfo,
    poolTokenIn: quote.poolTokenIn.amount,
    minOutputAssetAmount: quote.assetOut.amount,
    outputAssetId: quote.assetOut.assetId,
    initiatorAddr,
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

  console.log("✅ Remove Single Asset Liquidity executed successfully!");
  console.log({
    outputAssets: JSON.stringify(executionResponse.outputAssets),
    txnID: executionResponse.txnID
  });
}
