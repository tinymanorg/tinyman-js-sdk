import {
  LendingPool,
  RemoveLiquidity,
  SupportedNetwork,
  combineAndRegroupSignerTxns,
  fetchFolksLendingPool,
  generateOptIntoAssetTxns,
  poolUtils
} from "@tinymanorg/tinyman-js-sdk";
import {Account} from "algosdk";

import {algodClient} from "../../../util/client";
import {getOwnedAssetAmount} from "../../../util/account";
import {getIsAccountOptedIntoAsset} from "../../../util/asset";
import signerWithSecretKey from "../../../util/initiatorSigner";

export async function lendingPoolRemoveLiquidity({
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
    asset1ID: Number(asset_1.id),
    asset2ID: Number(asset_2.id)
  });

  const asset1FolksLendingPool = await fetchFolksLendingPool(
    algodClient,
    Number(asset_1.folks_lending_pool_application_id)
  );

  // Get the owned lending pool token amount, so we can decide how much to remove
  const ownedPoolTokenAssetAmount = await getOwnedAssetAmount(
    initiatorAddr,
    poolInfo.poolTokenID!
  );

  /**
   * For testing purposes, we will remove 1/4 of the owned lending pool tokens,
   * it can be any amount that is lower than the owned amount
   */
  const poolTokenAmountToBeRemoved = Math.floor(ownedPoolTokenAssetAmount / 4);

  let txGroup = await LendingPool.RemoveLiquidity.generateTxns({
    client: algodClient,
    pool: poolInfo,
    poolTokenIn: poolTokenAmountToBeRemoved,
    initiatorAddr,
    asset1Out: {
      fAssetId: Number(asset_1.fAsset_id),
      lendingAppId: Number(asset_1.folks_lending_pool_application_id),
      id: Number(asset_1.id)
    },
    asset2Out: {
      fAssetId: Number(asset_1.fAsset_id),
      lendingAppId: Number(asset_1.folks_lending_pool_application_id),
      id: Number(asset_1.id)
    },
    lendingManagerId: asset1FolksLendingPool.managerAppId,
    network: "testnet" as SupportedNetwork
  });

  const shouldIncludeAsset1OptInTxn = !getIsAccountOptedIntoAsset(
    initiatorAddr,
    Number(asset_1.id)
  );
  const shouldIncludeAsset2OptInTxn = !getIsAccountOptedIntoAsset(
    initiatorAddr,
    Number(asset_2.id)
  );

  if (shouldIncludeAsset1OptInTxn) {
    txGroup = combineAndRegroupSignerTxns(
      await generateOptIntoAssetTxns({
        client: algodClient,
        assetID: Number(asset_1.id),
        initiatorAddr
      }),
      txGroup
    );
  }

  if (shouldIncludeAsset2OptInTxn) {
    txGroup = combineAndRegroupSignerTxns(
      await generateOptIntoAssetTxns({
        client: algodClient,
        assetID: Number(asset_2.id),
        initiatorAddr
      }),
      txGroup
    );
  }

  const signedTxns = await RemoveLiquidity.v2.signTxns({
    txGroup,
    initiatorSigner: signerWithSecretKey(account)
  });

  const executionResponse = await RemoveLiquidity.v2.execute({
    client: algodClient,
    txGroup,
    signedTxns
  });

  console.log("✅ Lending Pool Remove Liquidity executed successfully!");
  console.log({
    outputAssets: JSON.stringify(executionResponse.outputAssets),
    txnID: executionResponse.txnID
  });
}
