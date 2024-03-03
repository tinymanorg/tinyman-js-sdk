import {
  poolUtils,
  SupportedNetwork,
  Swap,
  SwapType,
  getSwapQuoteContractVersion,
  SwapQuoteType,
  GenerateSwapTxnsParams,
  isAccountOptedIntoApp,
  getValidatorAppID,
  CONTRACT_VERSION,
  getAccountInformation,
  generateOptIntoValidatorTxns,
  sendAndWaitRawTransaction
} from "@tinymanorg/tinyman-js-sdk";
import {GenerateV1_1SwapTxnsParams} from "@tinymanorg/tinyman-js-sdk/dist/swap/types";
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
  asset_2,
  isSwapRouterEnabled = true
}: {
  account: Account;
  asset_1: {id: string; unit_name: string};
  asset_2: {id: string; unit_name: string};
  isSwapRouterEnabled?: boolean;
}) {
  try {
    const initiatorAddr = account.addr;
    const pools = await poolUtils.getPoolsForPair({
      client: algodClient,
      asset1ID: Number(asset_1.id),
      asset2ID: Number(asset_2.id),
      network: "testnet" as SupportedNetwork
    });
    const v1_1PoolReserves = await poolUtils.v1_1.getPoolReserves(algodClient, pools[0]);
    const v2PoolReserves = await poolUtils.v2.getPoolReserves(algodClient, pools[1]);

    const fixedInputSwapQuote = await Swap.getQuote({
      type: SwapType.FixedInput,
      pools: [
        {info: pools[0], reserves: v1_1PoolReserves},
        {info: pools[1], reserves: v2PoolReserves}
      ],
      amount: 1_000_000,
      assetIn: {id: asset_1.id, decimals: 6},
      assetOut: {id: asset_2.id, decimals: 6},
      isSwapRouterEnabled,
      network: "testnet"
    });

    let fixedInputSwapTxns;
    //  Omitting quote from commonParams as it is different for v1.1 and v2
    const commonParams: Omit<
      GenerateSwapTxnsParams | GenerateV1_1SwapTxnsParams,
      "quote"
    > = {
      client: algodClient,
      swapType: SwapType.FixedInput,
      slippage: 0.05,
      initiatorAddr
    };

    if (
      getSwapQuoteContractVersion(fixedInputSwapQuote) === CONTRACT_VERSION.V1_1 &&
      fixedInputSwapQuote.type === SwapQuoteType.Direct
    ) {
      fixedInputSwapTxns = await Swap.v1_1.generateTxns({
        ...commonParams,
        quoteAndPool: fixedInputSwapQuote.data
      });

      const accountInfo = await getAccountInformation(algodClient, account.addr);

      const isAppOptInRequired = !isAccountOptedIntoApp({
        appID: getValidatorAppID("testnet", CONTRACT_VERSION.V1_1),
        accountAppsLocalState: accountInfo["apps-local-state"]
      });

      if (isAppOptInRequired) {
        console.log("Opting in to the validator app...");

        const v1AppOptInTxns = await generateOptIntoValidatorTxns({
          client: algodClient,
          network: "testnet",
          contractVersion: CONTRACT_VERSION.V1_1,
          initiatorAddr: account.addr
        });

        // Sign the transactions using a wallet (or any other method)
        const signedTxns = await signerWithSecretKey(account)([v1AppOptInTxns]);
        // Send signed transactions to the network, and wait for confirmation
        const transactionData = await sendAndWaitRawTransaction(algodClient, [
          signedTxns
        ]);

        // Log the transaction data to the consol
        console.log(
          "Successfully opted into the validator app. Txn ID:",
          transactionData[0].txnID
        );
      }
    } else {
      fixedInputSwapTxns = await Swap.v2.generateTxns({
        ...commonParams,
        quote: fixedInputSwapQuote,
        network: "testnet"
      });
    }

    const signedTxns = await Swap.signTxns({
      quote: fixedInputSwapQuote,
      txGroup: fixedInputSwapTxns,
      initiatorSigner: signerWithSecretKey(account)
    });

    let swapExecutionResponse;

    if (getSwapQuoteContractVersion(fixedInputSwapQuote) === CONTRACT_VERSION.V1_1) {
      swapExecutionResponse = await Swap.v2.execute({
        quote: fixedInputSwapQuote,
        client: algodClient,
        signedTxns,
        txGroup: fixedInputSwapTxns
      });
    } else if (
      getSwapQuoteContractVersion(fixedInputSwapQuote) === CONTRACT_VERSION.V2 &&
      fixedInputSwapQuote.type === SwapQuoteType.Direct
    ) {
      swapExecutionResponse = await Swap.v1_1.execute({
        client: algodClient,
        txGroup: fixedInputSwapTxns,
        pool: fixedInputSwapQuote.data.pool,
        signedTxns,
        swapType: SwapType.FixedInput,
        initiatorAddr
      });
    }

    console.log("✅ Fixed Input Swap executed successfully!");
    console.log({txnID: swapExecutionResponse?.txnID});
  } catch (error) {
    console.log(error);
  }
}
