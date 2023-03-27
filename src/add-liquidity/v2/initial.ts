import algosdk, {Algodv2} from "algosdk";

import {tinymanJSSDKConfig} from "../../config";
import {CONTRACT_VERSION} from "../../contract/constants";
import {
  AssetWithAmountAndDecimals,
  AssetWithIdAndAmount
} from "../../util/asset/assetModels";
import {isAlgo} from "../../util/asset/assetUtils";
import {SignerTransaction, SupportedNetwork} from "../../util/commonTypes";
import {V2_LOCKED_POOL_TOKENS} from "../../util/pool/poolConstants";
import {V2PoolInfo} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {ADD_LIQUIDITY_APP_CALL_ARGUMENTS} from "../constants";
import {V2AddLiquidityType} from "./constants";
import {V2InitialAddLiquidityQuote} from "./types";
import {calculateV2InitialLiquidityAmount, getV2AddLiquidityAppCallFee} from "./util";
export * from "./common";

export function getQuote({
  pool,
  asset1,
  asset2,
  slippage = 0.05
}: {
  pool: V2PoolInfo;
  asset1: AssetWithAmountAndDecimals;
  asset2: AssetWithAmountAndDecimals;
  slippage?: number;
}): V2InitialAddLiquidityQuote {
  if (pool.issuedPoolTokens !== 0n) {
    throw new Error("Pool already has liquidity");
  }

  const geoMean = BigInt(
    Math.floor(Math.sqrt(Number(asset1.amount) * Number(asset2.amount)))
  );

  if (geoMean <= BigInt(V2_LOCKED_POOL_TOKENS)) {
    throw new Error(
      `Initial liquidity amount is too small. Liquidity amount must be greater than ${V2_LOCKED_POOL_TOKENS}, this quote is for ${geoMean}.`
    );
  }

  return {
    asset1In: {id: pool.asset1ID, amount: BigInt(asset1.amount)},
    asset2In: {id: pool.asset2ID, amount: BigInt(asset2.amount)},
    poolTokenOut: {
      id: pool.poolTokenID!,
      amount: calculateV2InitialLiquidityAmount(asset1, asset2)
    },
    slippage
  };
}

export async function generateTxns({
  client,
  pool,
  network,
  poolAddress,
  asset1In,
  asset2In,
  poolTokenId,
  initiatorAddr
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  network: SupportedNetwork;
  poolAddress: string;
  asset1In: AssetWithIdAndAmount;
  asset2In: AssetWithIdAndAmount;
  poolTokenId: number;
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const isAlgoPool = isAlgo(pool.asset2ID);
  const suggestedParams = await client.getTransactionParams().do();
  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: pool.asset1ID,
    amount: asset1In.amount,
    suggestedParams
  });
  const asset2InTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: asset2In.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        assetIndex: pool.asset2ID,
        amount: asset2In.amount,
        suggestedParams
      });
  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: getValidatorAppID(network, CONTRACT_VERSION.V2),
    appArgs: ADD_LIQUIDITY_APP_CALL_ARGUMENTS.v2.INITIAL_LIQUIDITY,
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(CONTRACT_VERSION.V2),
    accounts: [poolAddress],
    foreignAssets: [poolTokenId],
    suggestedParams
  });

  validatorAppCallTxn.fee = getV2AddLiquidityAppCallFee(V2AddLiquidityType.INITIAL);

  return algosdk
    .assignGroupID([asset1InTxn, asset2InTxn, validatorAppCallTxn])
    .map((txn) => ({txn, signers: [initiatorAddr]}));
}
