import { poolUtils, Swap, SwapType } from "@tinymanorg/tinyman-js-sdk";
import { getAccount } from "../../util/account";
import { getAssets } from "../../util/asset";
import signerWithSecretKey from "../../util/initiatorSigner";
import { SDK_TEST_ARGS } from "../../util/other";

/**
 * Executes a swap with a fixed output amount
 * (Output amount is entered by the user, input amount is to be calculated by the SDK)
 */
export async function fixedOutputSwap() {
  const account = await getAccount();
  const initiatorAddr = account.addr;
  const { ids: assetIds } = await getAssets();
  const [asset1ID, asset2ID] = assetIds;
  const pool = await poolUtils.v2.getPoolInfo({
    ...SDK_TEST_ARGS,
    asset1ID,
    asset2ID,
  });

  const fixedOutputSwapQuote = Swap.v2.getQuote(
    SwapType.FixedOutput,
    pool,
    { id: pool.asset2ID, amount: 1_000_000 },
    { assetIn: 6, assetOut: 6 }
  );

  console.log({ fixedOutputSwapQuote });

  const assetIn = {
    id: fixedOutputSwapQuote.assetInID,
    amount: fixedOutputSwapQuote.assetInAmount,
  };
  const assetOut = {
    id: fixedOutputSwapQuote.assetOutID,
    amount: fixedOutputSwapQuote.assetOutAmount,
  };

  const fixedOutputSwapTxns = await Swap.v2.generateTxns({
    ...SDK_TEST_ARGS,
    swapType: SwapType.FixedOutput,
    pool,
    initiatorAddr,
    assetIn,
    assetOut,
    slippage: 0.05,
  });
  const signedTxns = await Swap.v2.signTxns({
    txGroup: fixedOutputSwapTxns,
    initiatorSigner: signerWithSecretKey(account.sk),
  });
  const swapExecutionResponse = await Swap.v2.execute({
    ...SDK_TEST_ARGS,
    signedTxns,
    txGroup: fixedOutputSwapTxns,
    pool,
    assetIn,
  });

  console.log("✅ Fixed Output Swap executed successfully!");
  console.log({ swapExecutionResponse });
}
