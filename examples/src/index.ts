import {addFlexibleLiquidity} from "./operation/add-liquidity/addFlexibleLiquidity";
import {addInitialLiquidity} from "./operation/add-liquidity/addInitialLiquidity";
import {addSingleAssetLiquidity} from "./operation/add-liquidity/addSingleAssetLiquidity";
import {bootstrapPool} from "./operation/bootstrap/bootstrapPool";
import {removeLiquidity} from "./operation/remove-liquidity/removeLiquidity";
import {removeLiquidityWithSingleAssetOut} from "./operation/remove-liquidity/removeLiquidityWithSingleAssetOut";
import {fixedInputSwap} from "./operation/swap/fixedInputSwap";
import {fixedOutputSwap} from "./operation/swap/fixedOutputSwap";
import {getAccount} from "./util/account";
import {getAssetBalance, getAssetParams, getIsAccountOptedIntoAsset} from "./util/asset";
import {assertAccountHasBalance, executeAssetOptIn} from "./util/other";
import {lendingPoolAddLiquidity} from "./operation/lending-pool/add-liquidity/lendingPoolAddLiquidity";
import {lendingPoolRemoveLiquidity} from "./operation/lending-pool/remove-liquidity/lendingPoolRemoveLiquidity";

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
  await bootstrapPool({account, asset_1, asset_2});

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

  const shouldIncludeLendingPoolExamples = true;

  if (shouldIncludeLendingPoolExamples) {
    const algoAsset = {
      id: "0",
      unit_name: "ALGO",
      fAsset_id: "147171698",
      folks_lending_pool_application_id: "147169673"
    };
    const usdcAsset = {
      id: "67395862",
      unit_name: "USDC",
      fAsset_id: "147171826",
      folks_lending_pool_application_id: "147170678"
    };

    // Check if the user has enough ALGO balance
    const minAlgoAmount = 3_000_000;

    await assertAccountHasBalance(account.addr, minAlgoAmount);

    // Check if the user is opted into the USDC asset, if not, opt-in
    if (!(await getIsAccountOptedIntoAsset(account.addr, Number(usdcAsset.id)))) {
      await executeAssetOptIn(account, Number(usdcAsset.id));
    }

    if ((await getAssetBalance(account.addr, Number(usdcAsset.id))) < 100_000) {
      await fixedInputSwap({
        account,
        asset_1: algoAsset,
        asset_2: usdcAsset,
        isSwapRouterEnabled: false
      });
    }

    // Make sure to sort the assets according to the fAssetIds
    const [asset1, asset2] = [algoAsset, usdcAsset].sort(
      (a, b) => Number(b.fAsset_id) - Number(a.fAsset_id)
    );

    await lendingPoolAddLiquidity({account, asset_1: asset1, asset_2: asset2});
    await lendingPoolRemoveLiquidity({account, asset_1: asset1, asset_2: asset2});
  }

  console.log("✅ All operations completed successfully");
}

main();
