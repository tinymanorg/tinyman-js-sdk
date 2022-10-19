import algosdk, {ALGORAND_MIN_TX_FEE} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {MINT_APP_CALL_ARGUMENTS, V2_MINT_INNER_TXN_COUNT} from "../constants";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SupportedNetwork} from "../../util/commonTypes";
import {PoolInfo} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {isAlgo} from "../../util/asset/assetUtils";

export async function generateTxns({
  client,
  network,
  poolAddress,
  asset_1,
  asset_2,
  liquidityToken,
  initiatorAddr
}: {
  client: AlgodClient;
  pool: PoolInfo;
  network: SupportedNetwork;
  poolAddress: string;
  asset_1: {id: number; amount: number | bigint};
  asset_2: {id: number; amount: number | bigint};
  liquidityToken: {id: number; amount: number | bigint};
  slippage: number;
  initiatorAddr: string;
}) {
  let assetIn: {id: number; amount: number | bigint};

  if (asset_1.amount) {
    assetIn = asset_1;
  } else if (asset_2.amount) {
    assetIn = asset_2;
  } else {
    throw new Error("Please provide at least one asset amount to add liquidity.");
  }

  if (Boolean(asset_1.amount) === Boolean(asset_2.amount)) {
    throw new Error(
      "If you want to add asset 1 and asset 2 at the same time, please use flexible add liquidity."
    );
  }
  const isAlgoPool = isAlgo(assetIn.id);
  const suggestedParams = await client.getTransactionParams().do();
  const assetInTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: assetIn.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        assetIndex: assetIn.id,
        amount: assetIn.amount,
        suggestedParams
      });
  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: poolAddress,
    appIndex: getValidatorAppID(network, CONTRACT_VERSION.V2),
    appArgs: MINT_APP_CALL_ARGUMENTS.v2.SINGLE_ASSET_MODE,
    accounts: [poolAddress],
    foreignAssets: [liquidityToken.id],
    suggestedParams: {
      ...suggestedParams,
      // Add +1 to account for the fee of the outer txn
      fee: (V2_MINT_INNER_TXN_COUNT.SINGLE_ASSET_MODE + 1) * ALGORAND_MIN_TX_FEE
    }
  });

  return [
    {
      txn: validatorAppCallTxn,
      signers: [initiatorAddr]
    },
    {
      txn: assetInTxn,
      signers: [initiatorAddr]
    }
  ];
}
