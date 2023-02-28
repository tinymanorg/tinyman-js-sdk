import {
  ALGO_ASSET_ID,
  getAccountInformation,
} from "@tinymanorg/tinyman-js-sdk";
import {
  Account,
  makeAssetCreateTxnWithSuggestedParamsFromObject,
  waitForConfirmation,
} from "algosdk";
import { writeFileSync, readFileSync } from "fs";
import { getAccount } from "./account";
import { algodClient } from "./client";
import { assertAccountHasBalance } from "./other";

export const ASSETS_FILENAME = "assets.json";

type Assets = { ids: [number, number] };

export async function getAssetParams() {
  const { ids: assetIds } = await getAssets();
  const [asset1ID, asset2ID] = assetIds;
  const assetA = await algodClient.getAssetByID(asset1ID).do();
  const assetB = await algodClient.getAssetByID(asset2ID).do();
  const [asset_1, asset_2] = [assetA, assetB].map((asset) => ({
    id: String(asset.index),
    unit_name: asset.params["unit-name"],
  }));

  return { asset_1, asset_2 };
}

/**
 * @returns existing assets if exists, otherwise creates new asset pair
 */
export async function getAssets(): Promise<Assets> {
  let assets: Assets = tryGetAssetsFromJson();

  if (assets) {
    console.log(`✅ Assets already created: ${assets.ids}`);
  } else {
    const account = await getAccount();

    assertAccountHasBalance(account.addr);

    const ASSET_A_ID = await createAsset(account);
    const ASSET_B_ID = await createAsset(account);

    assets = { ids: [ASSET_A_ID, ASSET_B_ID] };

    console.log("✅ Assets created: " + JSON.stringify(assets.ids));

    writeFileSync(ASSETS_FILENAME, JSON.stringify(assets));
  }

  return assets;
}

function tryGetAssetsFromJson() {
  try {
    return JSON.parse(readFileSync(ASSETS_FILENAME).toString());
  } catch (_e) {
    return undefined;
  }
}

/**
 * Creates an asset with random name and returns the asset id
 * @returns asset id of the created asset
 */
export async function createAsset(account: Account) {
  const suggestedParams = await algodClient.getTransactionParams().do();
  const assetName = "A_" + Math.random().toString(36).substring(2, 8);
  const maxTotal = BigInt(2 ** 64) - BigInt(1);
  const txn = makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: account.addr,
    suggestedParams,
    total: maxTotal,
    decimals: 6,
    defaultFrozen: false,
    unitName: assetName,
    assetName,
  });
  const signedTxn = txn.signTxn(account.sk);
  const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
  const result = await waitForConfirmation(algodClient, txId, 1000);
  const assetId = result["asset-index"];

  console.log("✅ Asset created: " + assetId);

  return assetId;
}

export async function getIsAccountOptedIntoAsset(
  accountAddress: string,
  assetId: number
): Promise<Boolean> {
  if (assetId === ALGO_ASSET_ID) {
    return true;
  }

  return (await getAccountInformation(algodClient, accountAddress)).assets.some(
    (asset) => asset["asset-id"] === assetId
  );
}
