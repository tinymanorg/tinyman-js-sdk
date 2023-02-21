import {poolUtils, SupportedNetwork, Swap, SwapType} from "@tinymanorg/tinyman-js-sdk";
import {Account} from "algosdk";

import {algodClient} from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";

/**
 * Executes a swap with a fixed input amount
 * (Input amount is entered by the user, output amount is to be calculated by the SDK)
 */
export async function fixedInputSwap({
  account,
  asset_1,
  asset_2
}: {
  account: Account;
  asset_1: {id: string; unit_name: string};
  asset_2: {id: string; unit_name: string};
}) {
  const initiatorAddr = account.addr;
  const pool = await poolUtils.v2.getPoolInfo({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    asset1ID: Number(asset_1.id),
    asset2ID: Number(asset_2.id)
  });

  /**
   * This example uses only v2 quote. Similarly, we can use
   * Swap.getQuote method, which will return the best quote (highest rate)
   * after checking both v1 and v2
   */
  const fixedInputSwapQuote = Swap.v2.getQuote(
    SwapType.FixedInput,
    pool,
    {id: pool.asset1ID, amount: 1_000_000},
    {assetIn: 6, assetOut: 6}
  );
  const assetIn = {
    id: fixedInputSwapQuote.assetInID,
    amount: fixedInputSwapQuote.assetInAmount
  };
  const assetOut = {
    id: fixedInputSwapQuote.assetOutID,
    amount: fixedInputSwapQuote.assetOutAmount
  };

  const fixedInputSwapTxns = await Swap.v2.generateTxns({
    client: algodClient,
    swapType: SwapType.FixedInput,
    pool,
    initiatorAddr,
    assetIn,
    assetOut,
    slippage: 0.05
  });

  const signedTxns = await Swap.v2.signTxns({
    txGroup: fixedInputSwapTxns,
    initiatorSigner: signerWithSecretKey(account)
  });

  const swapExecutionResponse = await Swap.v2.execute({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    signedTxns,
    pool,
    txGroup: fixedInputSwapTxns,
    assetIn
  });

  console.log("✅ Fixed Input Swap executed successfully!");
  console.log({txnID: swapExecutionResponse.txnID});
}
