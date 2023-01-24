import { poolUtils, Swap, SwapType } from "@tinymanorg/tinyman-js-sdk";
import { getAccount } from "../../util/account";
import { getAssets } from "../../util/asset";
import signerWithSecretKey from "../../util/initiatorSigner";
import { SDK_TEST_ARGS } from "../../util/other";

/**
 * Executes a swap with a fixed input amount
 * (Input amount is entered by the user, output amount is to be calculated by the SDK)
 */
export async function fixedInputSwap() {
  const account = await getAccount();
  const initiatorAddr = account.addr;
  const { ids: assetIds } = await getAssets();
  const [asset1ID, asset2ID] = assetIds;
  const pool = await poolUtils.v2.getPoolInfo({
    ...SDK_TEST_ARGS,
    asset1ID,
    asset2ID,
  });
  const fixedInputSwapQuote = Swap.v2.getQuote(
    SwapType.FixedInput,
    pool,
    { id: pool.asset1ID, amount: 1_000_000 },
    { assetIn: 6, assetOut: 6 }
  );

  console.log({
    fixedInputSwapQuote,
  });

  const assetIn = {
    id: fixedInputSwapQuote.assetInID,
    amount: fixedInputSwapQuote.assetInAmount,
  };
  const assetOut = {
    id: fixedInputSwapQuote.assetOutID,
    amount: fixedInputSwapQuote.assetOutAmount,
  };

  const fixedInputSwapTxns = await Swap.v2.generateTxns({
    ...SDK_TEST_ARGS,
    swapType: SwapType.FixedInput,
    pool,
    initiatorAddr,
    assetIn,
    assetOut,
    slippage: 0.05,
  });

  const signedTxns = await Swap.v2.signTxns({
    txGroup: fixedInputSwapTxns,
    initiatorSigner: signerWithSecretKey(account.sk),
  });

  const swapExecutionResponse = await Swap.v2.execute({
    ...SDK_TEST_ARGS,
    signedTxns,
    pool,
    txGroup: fixedInputSwapTxns,
    assetIn,
  });

  console.log("✅ Fixed Input Swap executed successfully!");
  console.log({ swapExecutionResponse });
}
