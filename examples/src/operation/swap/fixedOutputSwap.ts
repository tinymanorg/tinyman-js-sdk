import {poolUtils, SupportedNetwork, Swap, SwapType} from "@tinymanorg/tinyman-js-sdk";
import {Account} from "algosdk";

import {algodClient} from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";

/**
 * Executes a swap with a fixed output amount
 * (Output amount is entered by the user, input amount is to be calculated by the SDK)
 */
export async function fixedOutputSwap({
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
  const fixedOutputSwapQuote = Swap.v2.getQuote(
    SwapType.FixedOutput,
    pool,
    {id: pool.asset2ID, amount: 1_000_000},
    {assetIn: 6, assetOut: 6}
  );

  const assetIn = {
    id: fixedOutputSwapQuote.assetInID,
    amount: fixedOutputSwapQuote.assetInAmount
  };
  const assetOut = {
    id: fixedOutputSwapQuote.assetOutID,
    amount: fixedOutputSwapQuote.assetOutAmount
  };

  const fixedOutputSwapTxns = await Swap.v2.generateTxns({
    client: algodClient,
    swapType: SwapType.FixedOutput,
    pool,
    initiatorAddr,
    assetIn,
    assetOut,
    slippage: 0.05
  });
  const signedTxns = await Swap.v2.signTxns({
    txGroup: fixedOutputSwapTxns,
    initiatorSigner: signerWithSecretKey(account)
  });
  const swapExecutionResponse = await Swap.v2.execute({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    signedTxns,
    txGroup: fixedOutputSwapTxns,
    pool,
    assetIn
  });

  console.log("✅ Fixed Output Swap executed successfully!");
  console.log({txnID: swapExecutionResponse.txnID});
}
