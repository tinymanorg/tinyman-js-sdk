import {Bootstrap, poolUtils, SupportedNetwork} from "@tinymanorg/tinyman-js-sdk";
import {Account} from "algosdk";

import {algodClient} from "../../util/client";
import signerWithSecretKey from "../../util/initiatorSigner";

/**
 * Creates (i.e. "Bootstraps") a pool with an owned asset pair
 */
export async function bootstrapPool({
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

  const bootstrapTxns = await Bootstrap.v2.generateTxns({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    asset_1,
    asset_2,
    initiatorAddr
  });

  const signedTxns = await Bootstrap.v2.signTxns({
    network: "testnet" as SupportedNetwork,
    txGroup: bootstrapTxns,
    initiatorSigner: signerWithSecretKey(account),
    asset1ID: Number(asset_1.id),
    asset2ID: Number(asset_2.id)
  });

  const bootstrapExecutionResponse = await Bootstrap.v2.execute({
    network: "testnet" as SupportedNetwork,
    client: algodClient,
    pool: poolInfo,
    txGroup: bootstrapTxns,
    ...signedTxns
  });

  const poolAddress = bootstrapExecutionResponse.account.address();

  console.log("✅ Pool bootstrapped!");
  console.log(`✅ Pool address: ${poolAddress}`);
  console.log(`✅ Pool token ID: ${bootstrapExecutionResponse.poolTokenID}`);
  console.log(
    "✅ See pool account on AlgoExplorer: " +
      `https://testnet.algoexplorer.io/address/${poolAddress}`
  );
}
