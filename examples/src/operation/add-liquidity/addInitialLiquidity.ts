import {
  AddLiquidity,
  combineAndRegroupSignerTxns,
  generateOptIntoAssetTxns,
  poolUtils,
  SupportedNetwork
} from "@tinymanorg/tinyman-js-sdk";
import {Account} from "algosdk";

import {algodClient} from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";

/**
 * Adds initial liquidity to a pool
 */
export async function addInitialLiquidity({
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
  const quote = AddLiquidity.v2.initial.getQuote({
    pool: poolInfo,
    asset1: {
      amount: 10_000_000,
      decimals: 6
    },
    asset2: {
      amount: 25_000_000,
      decimals: 6
    }
  });

  let addInitialLiqTxns = await AddLiquidity.v2.initial.generateTxns({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    pool: poolInfo,
    initiatorAddr,
    asset1In: quote.asset1In,
    asset2In: quote.asset2In,
    poolAddress: poolInfo.account.address(),
    poolTokenId: poolInfo.poolTokenID!
  });

  /**
   * We assume the account is not opted-in to pool token asset,
   * so we add asset opt in txn to the txn group
   */
  addInitialLiqTxns = combineAndRegroupSignerTxns(
    await generateOptIntoAssetTxns({
      client: algodClient,
      assetID: poolInfo.poolTokenID!,
      initiatorAddr
    }),
    addInitialLiqTxns
  );

  const signedTxns = await AddLiquidity.v2.initial.signTxns({
    txGroup: addInitialLiqTxns,
    initiatorSigner: signerWithSecretKey(account)
  });

  const executionResponse = await AddLiquidity.v2.initial.execute({
    client: algodClient,
    txGroup: addInitialLiqTxns,
    signedTxns,
    pool: poolInfo
  });

  console.log("✅ Add Initial Liquidity executed successfully!");
  console.log({txnID: executionResponse.txnID});
}
