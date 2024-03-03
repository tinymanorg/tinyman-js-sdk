import {Account} from "algosdk";
import {
  AddLiquidity,
  LendingPool,
  SupportedNetwork,
  combineAndRegroupSignerTxns,
  fetchFolksLendingPool,
  generateOptIntoAssetTxns,
  poolUtils
} from "@tinymanorg/tinyman-js-sdk";

import {algodClient} from "../../../util/client";
import {getIsAccountOptedIntoAsset} from "../../../util/asset";
import signerWithSecretKey from "../../../util/initiatorSigner";

/**
 * Adds liquidity to an existent lending pool using the proportional mode
 */
export async function lendingPoolAddLiquidity({
  account,
  asset_1,
  asset_2
}: {
  account: Account;
  asset_1: {
    id: string;
    unit_name: string;
    fAsset_id: string;
    folks_lending_pool_application_id: string;
  };
  asset_2: {
    id: string;
    unit_name: string;
    fAsset_id: string;
    folks_lending_pool_application_id: string;
  };
}) {
  const initiatorAddr = account.addr;
  const poolInfo = await poolUtils.v2.getPoolInfo({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    asset1ID: Number(asset_1.fAsset_id),
    asset2ID: Number(asset_2.fAsset_id)
  });
  const asset1FolksLendingPool = await fetchFolksLendingPool(
    algodClient,
    Number(asset_1.folks_lending_pool_application_id)
  );
  const asset2FolksLendingPool = await fetchFolksLendingPool(
    algodClient,
    Number(asset_2.folks_lending_pool_application_id)
  );
  /*
   * For testing purposes, we will add 100_000 of asset1 into the pool,
   * and calculate the amount of asset2 to be added.
   */
  const asset1Amount = 100_000;
  const lendingPoolRatio =
    Number(poolInfo.asset1Reserves) / Number(poolInfo.asset2Reserves);

  // Calculate the amount of fAsset1 to be added from the original asset1 amount
  const fAsset1Amount = LendingPool.calculateDepositReturn({
    depositAmount: asset1Amount,
    ...asset1FolksLendingPool
  });
  // Get the amount of fAsset2 to be added from the pool ratio
  const fAsset2Amount = Math.floor(Number(fAsset1Amount) / lendingPoolRatio);
  // Retrieve the amount of asset2 to be added from the fAsset2Amount
  const asset2Amount = LendingPool.calculateWithdrawReturn({
    withdrawAmount: fAsset2Amount,
    ...asset2FolksLendingPool
  });

  let txGroup = await LendingPool.AddLiquidity.generateTxns({
    client: algodClient,
    network: "testnet" as SupportedNetwork,
    poolAddress: poolInfo.account.address(),
    poolTokenId: poolInfo.poolTokenID!,
    lendingManagerId: asset1FolksLendingPool.managerAppId,
    asset1In: {
      amount: asset1Amount,
      id: Number(asset_1.id),
      fAssetId: Number(asset_1.fAsset_id),
      lendingAppId: Number(asset_1.folks_lending_pool_application_id)
    },
    asset2In: {
      amount: asset2Amount,
      id: Number(asset_2.id),
      fAssetId: Number(asset_2.fAsset_id),
      lendingAppId: Number(asset_2.folks_lending_pool_application_id)
    },
    initiatorAddr
  });

  if (!(await getIsAccountOptedIntoAsset(initiatorAddr, Number(poolInfo.poolTokenID!)))) {
    /**
     * Insert opt-in transaction to the txn group
     * if the account is not opted-in to the pool token
     */
    txGroup = combineAndRegroupSignerTxns(
      await generateOptIntoAssetTxns({
        client: algodClient,
        assetID: Number(poolInfo.poolTokenID),
        initiatorAddr
      }),
      txGroup
    );
  }

  const signedTxns = await AddLiquidity.v2.flexible.signTxns({
    txGroup,
    initiatorSigner: signerWithSecretKey(account)
  });

  const executionResponse = await AddLiquidity.v2.flexible.execute({
    client: algodClient,
    pool: poolInfo,
    txGroup,
    signedTxns
  });

  console.log("✅ Lending Pool Add Liquidity executed successfully!");
  console.log({txnID: executionResponse.txnID});
}
