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
 * Adds liquidity to an existent pool using only a single asset
 */
export async function addSingleAssetLiquidity() {
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
  const quote = AddLiquidity.v2.withSingleAsset.getQuote({
    pool: poolInfo,
    assetIn: {
      // Add liquidity only using asset1
      id: asset1ID,
      amount: 25_000_000,
    },
    decimals: {
      asset1: 6,
      asset2: 6,
    },
  });

  let addLiqTxns = await AddLiquidity.v2.withSingleAsset.generateTxns({
    ...SDK_TEST_ARGS,
    initiatorAddr,
    poolAddress: poolInfo.account.address(),
    assetIn: quote.assetIn,
    poolTokenId: poolInfo.poolTokenID!,
    minPoolTokenAssetAmount: quote.minPoolTokenAssetAmountWithSlippage,
  });

  if (!getIsAccountOptedIntoAsset(initiatorAddr, poolInfo.poolTokenID!)) {
    /**
     * Insert opt-in transaction to the txn group
     * if the account is not opted-in to the pool token
     */
    console.log("adding opt-in txn to the txn group");
    addLiqTxns = combineAndRegroupSignerTxns(
      await generateOptIntoAssetTxns({
        ...SDK_TEST_ARGS,
        assetID: poolInfo.poolTokenID!,
        initiatorAddr,
      }),
      addLiqTxns
    );
  }

  const signedTxns = await AddLiquidity.v2.withSingleAsset.signTxns({
    ...SDK_TEST_ARGS,
    txGroup: addLiqTxns,
    initiatorSigner: signerWithSecretKey(account.sk),
  });

  const executionResponse = await AddLiquidity.v2.withSingleAsset.execute({
    ...SDK_TEST_ARGS,
    txGroup: addLiqTxns,
    signedTxns,
    pool: poolInfo,
  });

  console.log("✅ Add Liquidity with Single Asset executed successfully!");
  console.log({ response: executionResponse });
}
