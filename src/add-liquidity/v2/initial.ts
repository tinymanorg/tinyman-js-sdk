import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {CONTRACT_VERSION} from "../../contract/constants";
import {isAlgo} from "../../util/asset/assetUtils";
import {SupportedNetwork} from "../../util/commonTypes";
import {V2_LOCKED_POOL_TOKENS} from "../../util/pool/poolConstants";
import {V2PoolInfo} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {ADD_LIQUIDITY_APP_CALL_ARGUMENTS} from "../constants";
import {V2AddLiquidityType} from "./constants";
import {V2InitialAddLiquidityQuote} from "./types";
import {calculateInitialAddLiquidity, getV2AddLiquidityAppCallFee} from "./util";
export * from "./common";

export function getQuote({
  pool,
  asset1,
  asset2,
  slippage = 0.05
}: {
  pool: V2PoolInfo;
  asset1: {
    amount: number | bigint;
    decimals: number;
  };
  asset2: {
    amount: number | bigint;
    decimals: number;
  };
  slippage?: number;
}): V2InitialAddLiquidityQuote {
  if (pool.issuedPoolTokens && pool.issuedPoolTokens > 0n) {
    throw new Error("Pool already has liquidity");
  }

  const geoMean = BigInt(
    Math.floor(Math.sqrt(Number(asset1.amount) * Number(asset2.amount)))
  );

  if (geoMean <= BigInt(V2_LOCKED_POOL_TOKENS)) {
    throw new Error(
      `Initial liquidity mint too small. Liquidity minting amount must be greater than ${V2_LOCKED_POOL_TOKENS}, this quote is for ${geoMean}.`
    );
  }

  const poolTokenAssetAmount = calculateInitialAddLiquidity(asset1, asset2);

  return {
    asset1In: {
      id: pool.asset1ID,
      amount: BigInt(asset1.amount)
    },
    asset2In: {
      id: pool.asset2ID,
      amount: BigInt(asset2.amount)
    },
    poolTokenOut: {
      id: pool.liquidityTokenID!,
      amount: poolTokenAssetAmount
    },
    slippage
  };
}

export async function generateTxns({
  client,
  pool,
  network,
  poolAddress,
  asset_1,
  asset_2,
  liquidityToken,
  initiatorAddr
}: {
  client: AlgodClient;
  pool: V2PoolInfo;
  network: SupportedNetwork;
  poolAddress: string;
  asset_1: {id: number; amount: number | bigint};
  asset_2: {id: number; amount: number | bigint};
  liquidityToken: {id: number; amount: number | bigint};
  initiatorAddr: string;
}) {
  const isAlgoPool = isAlgo(pool.asset2ID);
  const suggestedParams = await client.getTransactionParams().do();

  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: pool.asset1ID,
    amount: asset_1.amount,
    suggestedParams
  });
  const asset2InTxn = isAlgoPool
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: asset_2.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        assetIndex: pool.asset2ID,
        amount: asset_2.amount,
        suggestedParams
      });

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: getValidatorAppID(network, CONTRACT_VERSION.V2),
    appArgs: ADD_LIQUIDITY_APP_CALL_ARGUMENTS.v2.INITIAL_LIQUIDITY,
    accounts: [poolAddress],
    foreignAssets: [liquidityToken.id],
    suggestedParams
  });

  //  TODO: remove asset opt-in txn when we can group transactions on the client side
  const assetOptInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: initiatorAddr,
    assetIndex: liquidityToken.id,
    amount: 0,
    suggestedParams
  });

  validatorAppCallTxn.fee = getV2AddLiquidityAppCallFee(V2AddLiquidityType.INITIAL);

  const txGroup = algosdk.assignGroupID([
    assetOptInTxn,
    asset1InTxn,
    asset2InTxn,
    validatorAppCallTxn
  ]);

  return [
    {txn: txGroup[0], signers: [initiatorAddr]},
    {txn: txGroup[1], signers: [initiatorAddr]},
    {txn: txGroup[2], signers: [initiatorAddr]},
    {txn: txGroup[3], signers: [initiatorAddr]}
  ];
}
