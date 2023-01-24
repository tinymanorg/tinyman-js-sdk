import { Bootstrap, poolUtils } from "@tinymanorg/tinyman-js-sdk";
import { getAccount } from "../../util/account";
import { getAssets } from "../../util/asset";
import { algodClient } from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";
import { SDK_TEST_ARGS } from "../../util/other";

/**
 * Creates (i.e. "Bootstraps") a pool with an owned asset pair
 */
export async function bootstrapPool() {
  const account = await getAccount();
  const initiatorAddr = account.addr;
  const { ids: assetIds } = await getAssets();
  const [asset1ID, asset2ID] = assetIds;
  const assetA = await algodClient.getAssetByID(asset1ID).do();
  const assetB = await algodClient.getAssetByID(asset2ID).do();
  const [asset_1, asset_2] = [assetA, assetB].map((asset) => ({
    id: String(asset.index),
    unit_name: asset.params["unit-name"],
  }));

  const poolInfo = await poolUtils.v2.getPoolInfo({
    ...SDK_TEST_ARGS,
    asset1ID,
    asset2ID,
  });

  if (!poolUtils.isPoolNotCreated(poolInfo)) {
    console.log("⚠️ Pool already exists, skipping bootstrap.");
    return;
  }

  const bootstrapTxns = await Bootstrap.v2.generateTxns({
    ...SDK_TEST_ARGS,
    asset_1,
    asset_2,
    initiatorAddr,
  });

  const signedTxns = await Bootstrap.v2.signTxns({
    ...SDK_TEST_ARGS,
    txGroup: bootstrapTxns,
    initiatorSigner: signerWithSecretKey(account.sk),
    asset1ID,
    asset2ID,
  });

  const bootstrapExecutionResponse = await Bootstrap.v2.execute({
    ...SDK_TEST_ARGS,
    pool: poolInfo,
    txGroup: bootstrapTxns,
    ...signedTxns,
  });

  const poolAddress = bootstrapExecutionResponse.account.address();
  console.log("✅ Pool bootstrapped!");
  console.log("✅ Pool address: " + poolAddress);
  console.log("✅ Pool token ID: " + bootstrapExecutionResponse.poolTokenID);
  console.log(
    "✅ See pool account on AlgoExplorer: " +
      `https://testnet.algoexplorer.io/address/${poolAddress}`
  );
}
