import {
  AddLiquidity,
  combineAndRegroupSignerTxns,
  generateOptIntoAssetTxns,
  poolUtils,
} from "@tinymanorg/tinyman-js-sdk";
import { getAccount } from "../../util/account";
import { getAssets, getIsAccountOptedIntoAsset } from "../../util/asset";
import { algodClient } from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";
import { SDK_TEST_ARGS } from "../../util/other";

/**
 * Adds liquidity to an existent pool using the flexible mode
 */
export async function addFlexibleLiquidity() {
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

  if (poolUtils.isPoolEmpty(poolReserves)) {
    console.log("⚠️ Pool is EMPTY, you should add initial liquidity first.");
    return;
  }

  // Get a quote for the desired add amount
  const quote = AddLiquidity.v2.flexible.getQuote({
    pool: poolInfo,
    asset1: {
      amount: 25_000_000,
      decimals: 6,
    },
    asset2: {
      amount: 75_000_000,
      decimals: 6,
    },
  });

  let addFlexibleLiqTxns = await AddLiquidity.v2.flexible.generateTxns({
    ...SDK_TEST_ARGS,
    initiatorAddr,
    poolAddress: poolInfo.account.address(),
    asset1In: quote.asset1In,
    asset2In: quote.asset2In,
    poolTokenOut: quote.poolTokenOut,
    minPoolTokenAssetAmount: quote.minPoolTokenAssetAmountWithSlippage,
  });

  if (!getIsAccountOptedIntoAsset(initiatorAddr, poolInfo.poolTokenID!)) {
    /**
     * Insert opt-in transaction to the txn group
     * if the account is not opted-in to the pool token
     */
    console.log("adding opt-in txn to the txn group");
    addFlexibleLiqTxns = combineAndRegroupSignerTxns(
      await generateOptIntoAssetTxns({
        ...SDK_TEST_ARGS,
        assetID: poolInfo.poolTokenID!,
        initiatorAddr,
      }),
      addFlexibleLiqTxns
    );
  }

  const signedTxns = await AddLiquidity.v2.flexible.signTxns({
    ...SDK_TEST_ARGS,
    txGroup: addFlexibleLiqTxns,
    initiatorSigner: signerWithSecretKey(account.sk),
  });

  const executionResponse = await AddLiquidity.v2.flexible.execute({
    ...SDK_TEST_ARGS,
    txGroup: addFlexibleLiqTxns,
    signedTxns,
    pool: poolInfo,
  });

  console.log("✅ Add Flexible Liquidity executed successfully!");
  console.log({ response: executionResponse });
}
