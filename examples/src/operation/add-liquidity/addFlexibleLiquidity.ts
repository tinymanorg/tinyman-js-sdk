import {
  AddLiquidity,
  combineAndRegroupSignerTxns,
  generateOptIntoAssetTxns,
  poolUtils,
  SupportedNetwork
} from "@tinymanorg/tinyman-js-sdk";
import {Account} from "algosdk";

import {getIsAccountOptedIntoAsset} from "../../util/asset";
import {algodClient} from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";

/**
 * Adds liquidity to an existent pool using the flexible mode
 */
export async function addFlexibleLiquidity({
  account,
  asset_1,
  asset_2
}: {
  account: Account;
  asset_1: {id: string; unit_name: string};
  asset_2: {id: string; unit_name: string};
}) {
  const initiatorAddr = account.addr;
  const poolInfo = await poolUtils.v2.getPoolInfo({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    asset1ID: Number(asset_1.id),
    asset2ID: Number(asset_2.id)
  });

  // Get a quote for the desired add amount
  const quote = AddLiquidity.v2.flexible.getQuote({
    pool: poolInfo,
    asset1: {
      amount: 25_000_000,
      decimals: 6
    },
    asset2: {
      amount: 75_000_000,
      decimals: 6
    }
  });

  let addFlexibleLiqTxns = await AddLiquidity.v2.flexible.generateTxns({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    initiatorAddr,
    poolAddress: poolInfo.account.address(),
    asset1In: quote.asset1In,
    asset2In: quote.asset2In,
    poolTokenOut: quote.poolTokenOut,
    minPoolTokenAssetAmount: quote.minPoolTokenAssetAmountWithSlippage
  });

  if (!getIsAccountOptedIntoAsset(initiatorAddr, poolInfo.poolTokenID!)) {
    /**
     * Insert opt-in transaction to the txn group
     * if the account is not opted-in to the pool token
     */
    addFlexibleLiqTxns = combineAndRegroupSignerTxns(
      await generateOptIntoAssetTxns({
        client: algodClient,
        assetID: poolInfo.poolTokenID!,
        initiatorAddr
      }),
      addFlexibleLiqTxns
    );
  }

  const signedTxns = await AddLiquidity.v2.flexible.signTxns({
    txGroup: addFlexibleLiqTxns,
    initiatorSigner: signerWithSecretKey(account)
  });

  const executionResponse = await AddLiquidity.v2.flexible.execute({
    client: algodClient,
    txGroup: addFlexibleLiqTxns,
    signedTxns,
    pool: poolInfo
  });

  console.log("✅ Add Flexible Liquidity executed successfully!");
  console.log({txnID: executionResponse.txnID});
}
