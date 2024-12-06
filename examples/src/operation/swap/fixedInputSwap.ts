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

  const fixedInputSwapQuote = await Swap.v2.getQuote({
    type: SwapType.FixedInput,
    pool,
    amount: 1_000_000,
    assetIn: {id: pool.asset1ID, decimals: 6},
    assetOut: {id: pool.asset2ID, decimals: 6},
    isSwapRouterEnabled: true,
    network: "testnet"
  });

  const fixedInputSwapTxns = await Swap.v2.generateTxns({
    client: algodClient,
    network: "testnet",
    quote: fixedInputSwapQuote,
    swapType: SwapType.FixedInput,
    slippage: 0.05,
    initiatorAddr,
  });

  const signedTxns = await Swap.v2.signTxns({
    txGroup: fixedInputSwapTxns,
    initiatorSigner: signerWithSecretKey(account)
  });

  const swapExecutionResponse = await Swap.v2.execute({
    quote: fixedInputSwapQuote,
    client: algodClient,
    signedTxns,
    txGroup: fixedInputSwapTxns
  });

  console.log("✅ Fixed Input Swap executed successfully!");
  console.log({txnID: swapExecutionResponse.txnID});
}

/**
 * Executes a swap with a fixed input amount
 * (Input amount is entered by the user, output amount is to be calculated by the SDK)
 */
export async function fixedInputSwapWithoutSwapRouter({
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
   * after checking both v1 and v2, without using the swap router
   */

  const fixedInputSwapQuote = await Swap.v2.getQuote({
    type: SwapType.FixedInput,
    pool,
    amount: 1_000_000,
    assetIn: {id: pool.asset1ID, decimals: 6},
    assetOut: {id: pool.asset2ID, decimals: 6},
    isSwapRouterEnabled: false,
    network: "testnet"
  });

  const fixedInputSwapTxns = await Swap.v2.generateTxns({
    client: algodClient,
    network: "testnet",
    quote: fixedInputSwapQuote,
    swapType: SwapType.FixedInput,
    slippage: 0.05,
    initiatorAddr,
  });

  const signedTxns = await Swap.v2.signTxns({
    txGroup: fixedInputSwapTxns,
    initiatorSigner: signerWithSecretKey(account)
  });

  const swapExecutionResponse = await Swap.v2.execute({
    quote: fixedInputSwapQuote,
    client: algodClient,
    signedTxns,
    txGroup: fixedInputSwapTxns
  });

  console.log("✅ Fixed Input Swap with disabled Swap Router executed successfully!");
  console.log({txnID: swapExecutionResponse.txnID});
}
