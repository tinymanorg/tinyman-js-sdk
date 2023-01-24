import { poolUtils, RemoveLiquidity } from "@tinymanorg/tinyman-js-sdk";
import { getAccount, getOwnedAssetAmount } from "../../util/account";
import { getAssets } from "../../util/asset";
import { algodClient } from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";
import { SDK_TEST_ARGS } from "../../util/other";

/**
 * Removes a portion of owned liquidity from a pool
 */
export async function removeLiquidity() {
  const account = await getAccount();
  const initiatorAddr = account.addr;
  const { ids: assetIds } = await getAssets();
  const [asset1ID, asset2ID] = assetIds;
  const poolInfo = await poolUtils.v2.getPoolInfo({
    ...SDK_TEST_ARGS,
    asset1ID,
    asset2ID,
  });
  const poolReserves = await poolUtils.v2.getPoolReserves(
    algodClient,
    poolInfo
  );

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
    poolTokenIn: poolTokenAmountToBeRemoved,
  });

  const removeLiquidityTxns = await RemoveLiquidity.v2.generateTxns({
    ...SDK_TEST_ARGS,
    pool: poolInfo,
    initiatorAddr,
    poolTokenIn: quote.poolTokenIn.amount,
    minAsset1Amount: quote.asset1Out.amount,
    minAsset2Amount: quote.asset2Out.amount,
    slippage: 0.05,
  });

  const signedTxns = await RemoveLiquidity.v2.signTxns({
    ...SDK_TEST_ARGS,
    txGroup: removeLiquidityTxns,
    initiatorSigner: signerWithSecretKey(account.sk),
  });

  const executionResponse = await RemoveLiquidity.v2.execute({
    ...SDK_TEST_ARGS,
    txGroup: removeLiquidityTxns,
    signedTxns,
  });

  console.log("✅ Remove Liquidity executed successfully!");
  console.log({
    outputAssets: JSON.stringify(executionResponse.outputAssets),
    response: executionResponse,
  });
}
