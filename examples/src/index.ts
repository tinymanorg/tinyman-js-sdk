import { addFlexibleLiquidity } from "./operation/add-liquidity/addFlexibleLiquidity";
import { addInitialLiquidity } from "./operation/add-liquidity/addInitialLiquidity";
import { addSingleAssetLiquidity } from "./operation/add-liquidity/addSingleAssetLiquidity";
import { bootstrapPool } from "./operation/bootstrap/bootstrapPool";
import { removeLiquidity } from "./operation/remove-liquidity/removeLiquidity";
import { removeLiquidityWithSingleAssetOut } from "./operation/remove-liquidity/removeLiquidityWithSingleAssetOut";
import { fixedInputSwap } from "./operation/swap/fixedInputSwap";
import { fixedOutputSwap } from "./operation/swap/fixedOutputSwap";
import { getAccount } from "./util/account";
import { getAssets } from "./util/asset";

/**
 * Will run all the operations in the order they are defined
 * - You can remove `account.json` and `assets.json` files to start from scratch
 * - You can simply comment out the operations you don't want to run
 */
async function main() {
  // Initialize account data
  await getAccount();

  // Initialize assets for the pool
  await getAssets();

  // Create the pool with the owned assets
  await bootstrapPool();

  // Add some initial liquidity to the pool
  await addInitialLiquidity();

  // Add subsequent liquidity to the pool using the flexible mode
  await addFlexibleLiquidity();

  // Add subsequent liquidity to the pool using the single asset mode
  await addSingleAssetLiquidity();

  // Remove some of the owned liquidity from the pool
  await removeLiquidity();

  // Remove some of the owned liquidity from the pool, but only one asset
  await removeLiquidityWithSingleAssetOut();

  // Swap assets with fixed input
  await fixedInputSwap();

  // Swap assets with fixed output
  await fixedOutputSwap();

  console.log("✅ All operations completed successfully");
}

/**
 * Patch BigInt.toJSON to return a string, and not cause an error
 * ⚠️ This is for testing purposes ONLY ! SHOULD NOT BE USED IN PRODUCTION !
 */
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

main();
