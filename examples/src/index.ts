import {addFlexibleLiquidity} from "./operation/add-liquidity/addFlexibleLiquidity";
import {addInitialLiquidity} from "./operation/add-liquidity/addInitialLiquidity";
import {addSingleAssetLiquidity} from "./operation/add-liquidity/addSingleAssetLiquidity";
import {bootstrapPool} from "./operation/bootstrap/bootstrapPool";
import {removeLiquidity} from "./operation/remove-liquidity/removeLiquidity";
import {removeLiquidityWithSingleAssetOut} from "./operation/remove-liquidity/removeLiquidityWithSingleAssetOut";
import {fixedInputSwap} from "./operation/swap/fixedInputSwap";
import {fixedOutputSwap} from "./operation/swap/fixedOutputSwap";
import {getAccount} from "./util/account";
import {getAssetParams} from "./util/asset";

/**
 * Will run all the operations in the order they are defined
 * - You can remove `account.json` and `assets.json` files to start from scratch
 * - You can simply comment out the operations you don't want to run
 */
async function main() {
  // Initialize account and asset data
  const account = await getAccount();
  const {asset_1, asset_2} = await getAssetParams();

  // Create the pool with the owned assets
  // await bootstrapPool({ account, asset_1, asset_2 });

  // Add some initial liquidity to the pool
  await addInitialLiquidity({account, asset_1, asset_2});

  // Add subsequent liquidity to the pool using the flexible mode
  await addFlexibleLiquidity({account, asset_1, asset_2});

  // Add subsequent liquidity to the pool using the single asset mode
  await addSingleAssetLiquidity({account, asset_1, asset_2});

  // Remove some of the owned liquidity from the pool
  await removeLiquidity({account, asset_1, asset_2});

  // Remove some of the owned liquidity from the pool, but only one asset
  await removeLiquidityWithSingleAssetOut({account, asset_1, asset_2});

  // Swap assets with fixed input
  await fixedInputSwap({account, asset_1, asset_2});

  // Swap assets with fixed output
  await fixedOutputSwap({account, asset_1, asset_2});

  console.log("✅ All operations completed successfully");
}

main();
