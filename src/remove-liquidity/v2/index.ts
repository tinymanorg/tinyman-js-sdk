import algosdk, {Algodv2, ALGORAND_MIN_TX_FEE, Transaction} from "algosdk";

import {SwapV2} from "../../swap/v2";
import {SignerTransaction, InitiatorSigner} from "../../util/commonTypes";
import {PoolReserves, V2PoolInfo} from "../../util/pool/poolTypes";
import {getTxnGroupID, sendAndWaitRawTransaction} from "../../util/util";
import {
  V2RemoveLiquidityTxnIndices,
  V2_LOCKED_POOL_TOKENS,
  V2_REMOVE_LIQUIDITY_APP_ARGUMENT,
  V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT
} from "./constants";
import {V2RemoveLiquidityQuote, V2SingleAssetRemoveLiquidityQuote} from "./types";

/**
 * Get a quote for how many of assets 1 and 2 a deposit of `poolTokenAssetIn` is worth at this moment. This
 * does not execute any transactions.
 */
function getQuote({
  pool,
  reserves,
  poolTokenAssetIn,
  slippage = 0.05
}: {
  pool: V2PoolInfo;
  reserves: PoolReserves;
  poolTokenAssetIn: number | bigint;
  slippage?: number;
}): V2RemoveLiquidityQuote {
  const poolTokenAssetIn_bigInt = BigInt(poolTokenAssetIn);
  const {asset_1_output_amount, asset_2_output_amount} =
    calculateRemoveLiquidityOutputAmounts(poolTokenAssetIn_bigInt, reserves);

  return {
    round: reserves.round,
    asset1Out: {
      assetId: pool.asset1ID,
      amount: asset_1_output_amount
    },
    asset2Out: {
      assetId: pool.asset2ID,
      amount: asset_2_output_amount
    },
    poolTokenAsset: {
      assetId: pool.liquidityTokenID!,
      amount: poolTokenAssetIn_bigInt
    },
    slippage
  };
}

function getSingleAssetRemoveLiquidityQuote({
  pool,
  reserves,
  poolTokenAssetInAmount: poolTokenAssetIn,
  assetOutID,
  decimals,
  slippage = 0.05
}: {
  pool: V2PoolInfo;
  reserves: PoolReserves;
  poolTokenAssetInAmount: number | bigint;
  assetOutID: number;
  decimals: {assetIn: number; assetOut: number};
  slippage?: number;
}): V2SingleAssetRemoveLiquidityQuote {
  const poolTokenAssetIn_bigInt = BigInt(poolTokenAssetIn);
  const {asset_1_output_amount, asset_2_output_amount} =
    calculateRemoveLiquidityOutputAmounts(poolTokenAssetIn_bigInt, reserves);
  // TODO: remove `!` once pool info shape is updated
  const total_fee_share = pool.totalFeeShare!;

  let quote: V2SingleAssetRemoveLiquidityQuote;

  if (assetOutID === pool.asset1ID) {
    const {swap_output_amount, total_fee_amount, price_impact} =
      SwapV2.calculateFixedInputSwap({
        input_supply: reserves.asset2 - asset_2_output_amount,
        output_supply: reserves.asset1 - asset_1_output_amount,
        swap_input_amount: asset_2_output_amount,
        total_fee_share,
        decimals
      });

    quote = {
      round: reserves.round,
      assetOut: {
        assetId: assetOutID,
        amount: asset_1_output_amount + swap_output_amount
      },
      poolTokenAsset: {
        assetId: pool.liquidityTokenID!,
        amount: poolTokenAssetIn_bigInt
      },
      slippage,
      internalSwapQuote: {
        amountIn: {
          assetId: pool.asset2ID,
          amount: asset_2_output_amount
        },
        amountOut: {
          assetId: pool.asset1ID,
          amount: swap_output_amount
        },
        swapFees: {
          assetId: pool.asset2ID,
          amount: total_fee_amount
        },
        priceImpact: price_impact
      }
    };
  } else if (assetOutID === pool.asset2ID) {
    const {swap_output_amount, total_fee_amount, price_impact} =
      SwapV2.calculateFixedInputSwap({
        input_supply: reserves.asset1 - asset_1_output_amount,
        output_supply: reserves.asset2 - asset_2_output_amount,
        swap_input_amount: asset_1_output_amount,
        total_fee_share,
        decimals
      });

    quote = {
      round: reserves.round,
      assetOut: {
        assetId: assetOutID,
        amount: asset_2_output_amount + swap_output_amount
      },
      poolTokenAsset: {
        assetId: pool.liquidityTokenID!,
        amount: poolTokenAssetIn_bigInt
      },
      slippage,
      internalSwapQuote: {
        amountIn: {
          assetId: pool.asset2ID,
          amount: asset_2_output_amount
        },
        amountOut: {
          assetId: pool.asset1ID,
          amount: swap_output_amount
        },
        swapFees: {
          assetId: pool.asset2ID,
          amount: total_fee_amount
        },
        priceImpact: price_impact
      }
    };
  } else {
    throw new Error("assetOutID must be one of the pool assets");
  }

  return quote;
}

function calculateRemoveLiquidityOutputAmounts(
  pool_token_asset_amount: number | bigint,
  reserves: PoolReserves
) {
  let asset_1_output_amount: bigint, asset_2_output_amount: bigint;
  const poolTokenAssetAmountBigInt = BigInt(pool_token_asset_amount);
  const issuedPoolTokens = reserves.issuedLiquidity;

  if (issuedPoolTokens > poolTokenAssetAmountBigInt + BigInt(V2_LOCKED_POOL_TOKENS)) {
    asset_1_output_amount =
      (poolTokenAssetAmountBigInt * reserves.asset1) / issuedPoolTokens;
    asset_2_output_amount =
      (poolTokenAssetAmountBigInt * reserves.asset2) / issuedPoolTokens;
  } else {
    asset_1_output_amount = reserves.asset1;
    asset_2_output_amount = reserves.asset2;
  }

  return {asset_1_output_amount, asset_2_output_amount};
}

/**
 * Generates transactions for multiple asset out remove liquidity operation
 */
async function generateTxns({
  client,
  pool,
  poolTokenAssetAmount,
  initiatorAddr,
  minAsset1Amount,
  minAsset2Amount
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  poolTokenAssetAmount: number | bigint;
  initiatorAddr: string;
  minAsset1Amount: number | bigint;
  minAsset2Amount: number | bigint;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const poolAddress = pool.account.address();
  const poolTokenAssetId = pool.liquidityTokenID;

  if (!poolTokenAssetId) {
    throw new Error("Pool token asset ID is missing");
  }

  const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: poolTokenAssetId,
    amount: poolTokenAssetAmount,
    suggestedParams
  });

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: pool.validatorAppID,
    appArgs: [
      V2_REMOVE_LIQUIDITY_APP_ARGUMENT,
      algosdk.encodeUint64(minAsset1Amount),
      algosdk.encodeUint64(minAsset2Amount)
    ],
    accounts: [poolAddress],
    foreignAssets: [pool.asset1ID, pool.asset2ID],
    suggestedParams
  });

  // Add + 1 for outer txn cost
  validatorAppCallTxn.fee =
    (V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT + 1) * ALGORAND_MIN_TX_FEE;

  const txns: Transaction[] = [];

  txns[V2RemoveLiquidityTxnIndices.ASSET_TRANSFER_TXN] = assetTransferTxn;
  txns[V2RemoveLiquidityTxnIndices.APP_CALL_TXN] = validatorAppCallTxn;

  const txGroup = algosdk.assignGroupID(txns);

  return [
    {
      txn: txGroup[V2RemoveLiquidityTxnIndices.ASSET_TRANSFER_TXN],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[V2RemoveLiquidityTxnIndices.APP_CALL_TXN],
      signers: [initiatorAddr]
    }
  ];
}

/**
 * Generates transactions for single asset out remove liquidity operation
 */
async function generateSingleAssetOutTxns({
  client,
  pool,
  initiatorAddr,
  poolTokenAssetAmount,
  outputAssetId,
  minOutputAssetAmount
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  outputAssetId: number;
  poolTokenAssetAmount: number | bigint;
  initiatorAddr: string;
  minOutputAssetAmount: number | bigint;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const {asset1ID, asset2ID} = pool;
  const poolAddress = pool.account.address();
  const poolTokenAssetId = pool.liquidityTokenID;

  if (!poolTokenAssetId) {
    throw new Error("Pool token asset ID is missing");
  }

  let minAsset1Amount = 0 as number | bigint;
  let minAsset2Amount = 0 as number | bigint;

  if (outputAssetId === asset1ID) {
    minAsset1Amount = minOutputAssetAmount;
    minAsset2Amount = 0;
  } else if (outputAssetId === asset2ID) {
    minAsset1Amount = 0;
    minAsset2Amount = minOutputAssetAmount;
  } else {
    throw new Error("Invalid output asset id. It doesn't match with pool assets");
  }

  const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: poolTokenAssetId,
    amount: poolTokenAssetAmount,
    suggestedParams
  });

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: pool.validatorAppID,
    appArgs: [
      V2_REMOVE_LIQUIDITY_APP_ARGUMENT,
      algosdk.encodeUint64(minAsset1Amount),
      algosdk.encodeUint64(minAsset2Amount)
    ],
    accounts: [poolAddress],
    foreignAssets: [outputAssetId],
    suggestedParams
  });

  // Add + 1 for outer txn cost
  validatorAppCallTxn.fee =
    (V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT + 1) * ALGORAND_MIN_TX_FEE;

  const txns: Transaction[] = [];

  txns[V2RemoveLiquidityTxnIndices.ASSET_TRANSFER_TXN] = assetTransferTxn;
  txns[V2RemoveLiquidityTxnIndices.APP_CALL_TXN] = validatorAppCallTxn;

  const txGroup = algosdk.assignGroupID(txns);

  return [
    {
      txn: txGroup[V2RemoveLiquidityTxnIndices.ASSET_TRANSFER_TXN],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[V2RemoveLiquidityTxnIndices.APP_CALL_TXN],
      signers: [initiatorAddr]
    }
  ];
}

function signTxns({
  txGroup,
  initiatorSigner
}: {
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  return initiatorSigner([txGroup]);
}

async function execute({
  client,
  pool,
  txGroup,
  signedTxns
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
}) {
  const [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);

  /**
   * TODO: How to get amounts?
   * check: 07_remove_liquidity.py
   */

  console.log({
    confirmedRound,
    txnID
  });

  return {
    round: confirmedRound,
    txnID,
    liquidityID: pool.liquidityTokenID!,
    groupID: getTxnGroupID(txGroup)
  };
}

function getRemoveLiquidityQuoteAmountsWithSlippage(
  quote: V2RemoveLiquidityQuote
): Pick<V2RemoveLiquidityQuote, "asset1Out" | "asset2Out"> {
  return {
    asset1Out: {
      assetId: quote.asset1Out.assetId,
      amount: getAmountWithSlippage(quote.asset1Out.amount, quote.slippage)
    },
    asset2Out: {
      assetId: quote.asset2Out.assetId,
      amount: getAmountWithSlippage(quote.asset2Out.amount, quote.slippage)
    }
  };
}

function getSingleAssetRemoveLiquidityQuoteAmountWithSlippage(
  quote: V2SingleAssetRemoveLiquidityQuote
): V2SingleAssetRemoveLiquidityQuote["assetOut"] {
  return {
    assetId: quote.assetOut.assetId,
    amount: getAmountWithSlippage(quote.assetOut.amount, quote.slippage)
  };
}

function getAmountWithSlippage(amount: bigint, slippage: number): bigint {
  return amount - multiplyBigIntWithFloat(amount, slippage);
}

/**
 * TODO: this is a workaround just for testing, probably we can find a better way
 */
function multiplyBigIntWithFloat(bigIntNumber: bigint, floatNumber: number): bigint {
  const MULTIPLIER = 1_000_000_000_000_000;

  return (bigIntNumber * BigInt(MULTIPLIER * floatNumber)) / BigInt(MULTIPLIER);
}

export const RemoveLiquidityV2 = {
  getQuote,
  getRemoveLiquidityQuoteAmountsWithSlippage,
  getSingleAssetRemoveLiquidityQuote,
  getSingleAssetRemoveLiquidityQuoteAmountWithSlippage,
  getAmountWithSlippage,
  generateTxns,
  generateSingleAssetOutTxns,
  signTxns,
  execute
};
