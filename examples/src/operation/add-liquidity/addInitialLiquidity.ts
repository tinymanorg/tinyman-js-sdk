import {
  AddLiquidity,
  combineAndRegroupSignerTxns,
  generateOptIntoAssetTxns,
  poolUtils,
} from "@tinymanorg/tinyman-js-sdk";
import { getAccount } from "../../util/account";
import { getAssets } from "../../util/asset";
import { algodClient } from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";
import { SDK_TEST_ARGS } from "../../util/other";

/**
 * Adds initial liquidity to a pool
 */
export async function addInitialLiquidity() {
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

  if (!poolUtils.isPoolEmpty(poolReserves)) {
    console.log(
      "⚠️ Pool is not empty, cannot add initial liquidity, skipping."
    );
    return;
  }

  // Get a quote for the desired add amount
  const quote = AddLiquidity.v2.initial.getQuote({
    pool: poolInfo,
    asset1: {
      amount: 10_000_000,
      decimals: 6,
    },
    asset2: {
      amount: 25_000_000,
      decimals: 6,
    },
  });

  let addInitialLiqTxns = await AddLiquidity.v2.initial.generateTxns({
    ...SDK_TEST_ARGS,
    pool: poolInfo,
    initiatorAddr,
    asset1In: quote.asset1In,
    asset2In: quote.asset2In,
    poolAddress: poolInfo.account.address(),
    poolTokenId: poolInfo.poolTokenID!,
  });

  /**
   * We assume the account is not opted-in to pool token asset,
   * so we add asset opt in txn to the txn group
   */
  addInitialLiqTxns = combineAndRegroupSignerTxns(
    await generateOptIntoAssetTxns({
      ...SDK_TEST_ARGS,
      assetID: poolInfo.poolTokenID!,
      initiatorAddr,
    }),
    addInitialLiqTxns
  );

  const signedTxns = await AddLiquidity.v2.initial.signTxns({
    ...SDK_TEST_ARGS,
    txGroup: addInitialLiqTxns,
    initiatorSigner: signerWithSecretKey(account.sk),
  });

  const executionResponse = await AddLiquidity.v2.initial.execute({
    ...SDK_TEST_ARGS,
    txGroup: addInitialLiqTxns,
    signedTxns,
    pool: poolInfo,
  });

  console.log("✅ Add Initial Liquidity executed successfully!");
  console.log({ response: executionResponse });
}
