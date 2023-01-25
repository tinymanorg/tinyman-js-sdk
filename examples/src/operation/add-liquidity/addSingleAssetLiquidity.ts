import {
  AddLiquidity,
  combineAndRegroupSignerTxns,
  generateOptIntoAssetTxns,
  poolUtils,
  SupportedNetwork,
} from "@tinymanorg/tinyman-js-sdk";
import { Account } from "algosdk";
import { getAssets, getIsAccountOptedIntoAsset } from "../../util/asset";
import { algodClient } from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";

/**
 * Adds liquidity to an existent pool using only a single asset
 */
export async function addSingleAssetLiquidity({
  account,
  asset_1,
  asset_2,
}: {
  account: Account;
  asset_1: { id: string; unit_name: string };
  asset_2: { id: string; unit_name: string };
}) {
  const initiatorAddr = account.addr;
  const { ids: assetIds } = await getAssets();
  const [asset1ID, asset2ID] = assetIds;
  const poolInfo = await poolUtils.v2.getPoolInfo({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    asset1ID: Number(asset_1.id),
    asset2ID: Number(asset_2.id),
  });
  const poolReserves = await poolUtils.v2.getPoolReserves(
    algodClient,
    poolInfo
  );

  if (poolUtils.isPoolEmpty(poolReserves)) {
    throw new Error(
      "⚠️ Pool is EMPTY, you should add initial liquidity first."
    );
  }

  // Get a quote for the desired add amount
  const quote = AddLiquidity.v2.withSingleAsset.getQuote({
    pool: poolInfo,
    assetIn: {
      // Add liquidity only using asset1
      id: asset1ID,
      amount: 25_000_000,
    },
    decimals: {
      asset1: 6,
      asset2: 6,
    },
  });

  let addLiqTxns = await AddLiquidity.v2.withSingleAsset.generateTxns({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    initiatorAddr,
    poolAddress: poolInfo.account.address(),
    assetIn: quote.assetIn,
    poolTokenId: poolInfo.poolTokenID!,
    minPoolTokenAssetAmount: quote.minPoolTokenAssetAmountWithSlippage,
  });

  if (!getIsAccountOptedIntoAsset(initiatorAddr, poolInfo.poolTokenID!)) {
    /**
     * Insert opt-in transaction to the txn group
     * if the account is not opted-in to the pool token
     */
    addLiqTxns = combineAndRegroupSignerTxns(
      await generateOptIntoAssetTxns({
        client: algodClient,
        assetID: poolInfo.poolTokenID!,
        initiatorAddr,
      }),
      addLiqTxns
    );
  }

  const signedTxns = await AddLiquidity.v2.withSingleAsset.signTxns({
    txGroup: addLiqTxns,
    initiatorSigner: signerWithSecretKey(account),
  });

  const executionResponse = await AddLiquidity.v2.withSingleAsset.execute({
    client: algodClient,
    txGroup: addLiqTxns,
    signedTxns,
    pool: poolInfo,
  });

  console.log("✅ Add Liquidity with Single Asset executed successfully!");
  console.log({ txnID: executionResponse.txnID });
}
