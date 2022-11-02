import algosdk, {ALGORAND_MIN_TX_FEE, encodeUint64} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {MINT_APP_CALL_ARGUMENTS, V2_MINT_INNER_TXN_COUNT} from "../constants";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SupportedNetwork} from "../../util/commonTypes";
import {PoolInfo, PoolReserves, PoolStatus} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {isAlgo} from "../../util/asset/assetUtils";
import {calculateSubsequentAddLiquidity} from "./util";
import {poolUtils} from "../../util/pool";
export * from "./common";

/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 */
export function getQuote({
  pool,
  reserves,
  assetIn,
  slippage = 0.05
}: {
  pool: PoolInfo;
  reserves: PoolReserves;
  assetIn: {
    id: number;
    amount: number | bigint;
  };
  slippage?: number;
}) {
  if (reserves.issuedLiquidity === 0n) {
    throw new Error("Pool has no liquidity");
  }

  if (pool.status !== PoolStatus.READY) {
    throw new Error("Pool is not ready");
  }

  const isAsset1 = assetIn.id === pool.asset1ID;

  const {
    poolTokenAssetAmount,
    swapInAmount,
    swapOutAmount,
    swapPriceImpact,
    swapTotalFeeAmount
  } = calculateSubsequentAddLiquidity(
    reserves,
    pool.totalFeeShare!,
    isAsset1 ? assetIn.amount : 0,
    isAsset1 ? 0 : assetIn.amount
  );

  const swapQuote = {
    amountIn: swapInAmount,
    amountOut: swapOutAmount,
    swapFees: swapTotalFeeAmount,
    priceImpact: swapPriceImpact
  };
  const minPoolTokenAssetAmountWithSlippage =
    poolTokenAssetAmount - BigInt(Math.ceil(Number(poolTokenAssetAmount) * slippage));

  return {
    asset1ID: pool.asset1ID,
    asset2ID: pool.asset2ID,
    assetIn: BigInt(assetIn.amount),
    liquidityOut: poolTokenAssetAmount,
    liquidityID: pool.liquidityTokenID!,
    round: reserves.round,
    share: poolUtils.getPoolShare(
      reserves.issuedLiquidity + swapOutAmount,
      swapOutAmount
    ),
    slippage,
    swapQuote,
    minPoolTokenAssetAmountWithSlippage
  };
}

export async function generateTxns({
  client,
  network,
  poolAddress,
  asset_1,
  asset_2,
  liquidityToken,
  initiatorAddr,
  minPoolTokenAssetAmount
}: {
  client: AlgodClient;
  network: SupportedNetwork;
  poolAddress: string;
  // TODO: consider getting assetIn instead of asset_1 and asset_2
  asset_1: {id: number; amount: number | bigint};
  asset_2: {id: number; amount: number | bigint};
  liquidityToken: {id: number; amount: number | bigint};
  initiatorAddr: string;
  minPoolTokenAssetAmount: bigint;
}) {
  if (Boolean(asset_1.amount) && Boolean(asset_2.amount)) {
    throw new Error(
      "If you want to add asset 1 and asset 2 at the same time, please use flexible add liquidity."
    );
  }

  let assetIn: {id: number; amount: number | bigint};

  if (asset_1.amount) {
    assetIn = asset_1;
  } else if (asset_2.amount) {
    assetIn = asset_2;
  } else {
    throw new Error("Please provide at least one asset amount to add liquidity.");
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
    from: initiatorAddr,
    appIndex: getValidatorAppID(network, CONTRACT_VERSION.V2),
    appArgs: [
      ...MINT_APP_CALL_ARGUMENTS.v2.SINGLE_ASSET_MODE,
      encodeUint64(minPoolTokenAssetAmount)
    ],
    accounts: [poolAddress],
    foreignAssets: [liquidityToken.id],
    suggestedParams: {
      ...suggestedParams,
      // Add +1 to account for the fee of the outer txn
      fee: (V2_MINT_INNER_TXN_COUNT.SINGLE_ASSET_MODE + 1) * ALGORAND_MIN_TX_FEE
    }
  });
  //  TODO: return txns ungrouped
  const txGroup = algosdk.assignGroupID([assetInTxn, validatorAppCallTxn]);

  return [
    {
      txn: txGroup[0],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[1],
      signers: [initiatorAddr]
    }
  ];
}
