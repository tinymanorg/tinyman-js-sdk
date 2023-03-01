import algosdk, {Algodv2, ALGORAND_MIN_TX_FEE, Transaction} from "algosdk";

import {tinymanJSSDKConfig} from "../../config";
import {CONTRACT_VERSION} from "../../contract/constants";
import {SwapV2} from "../../swap/v2";
import {AssetWithIdAndAmount} from "../../util/asset/assetModels";
import {SignerTransaction, InitiatorSigner} from "../../util/commonTypes";
import {V2_LOCKED_POOL_TOKENS} from "../../util/pool/poolConstants";
import {PoolReserves, V2PoolInfo} from "../../util/pool/poolTypes";
import {getAppCallInnerAssetData} from "../../util/transaction/transactionUtils";
import {applySlippageToAmount, sendAndWaitRawTransaction} from "../../util/util";
import {
  V2RemoveLiquidityTxnIndices,
  V2_REMOVE_LIQUIDITY_APP_ARGUMENT,
  V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT
} from "./constants";
import {
  V2RemoveLiquidityExecution,
  V2RemoveLiquidityQuote,
  V2SingleAssetRemoveLiquidityQuote
} from "./types";

/**
 * Get a quote for how many of assets 1 and 2 a deposit of `poolTokenIn` is worth at this moment. This
 * does not execute any transactions.
 */
function getQuote({
  pool,
  reserves,
  poolTokenIn
}: {
  pool: V2PoolInfo;
  reserves: PoolReserves;
  poolTokenIn: number | bigint;
}): V2RemoveLiquidityQuote {
  const poolTokenIn_bigInt = BigInt(poolTokenIn);
  const {asset1OutputAmount, asset2OutputAmount} = calculateRemoveLiquidityOutputAmounts(
    poolTokenIn_bigInt,
    reserves
  );

  return {
    round: reserves.round,
    asset1Out: {assetId: pool.asset1ID, amount: asset1OutputAmount},
    asset2Out: {assetId: pool.asset2ID, amount: asset2OutputAmount},
    poolTokenIn: {assetId: pool.poolTokenID!, amount: poolTokenIn_bigInt}
  };
}

function getSingleAssetRemoveLiquidityQuote({
  pool,
  reserves,
  poolTokenIn,
  assetOutID,
  decimals
}: {
  pool: V2PoolInfo;
  reserves: PoolReserves;
  poolTokenIn: number | bigint;
  assetOutID: number;
  decimals: {assetIn: number; assetOut: number};
}): V2SingleAssetRemoveLiquidityQuote {
  const poolTokenIn_bigInt = BigInt(poolTokenIn);
  const {asset1OutputAmount, asset2OutputAmount} = calculateRemoveLiquidityOutputAmounts(
    poolTokenIn_bigInt,
    reserves
  );
  const totalFeeShare = pool.totalFeeShare!;

  let quote: V2SingleAssetRemoveLiquidityQuote;

  if (assetOutID === pool.asset1ID) {
    const {swapOutputAmount, totalFeeAmount, priceImpact} =
      SwapV2.calculateFixedInputSwap({
        inputSupply: reserves.asset2 - asset2OutputAmount,
        outputSupply: reserves.asset1 - asset1OutputAmount,
        swapInputAmount: asset2OutputAmount,
        totalFeeShare,
        decimals
      });

    quote = {
      round: reserves.round,
      assetOut: {assetId: assetOutID, amount: asset1OutputAmount + swapOutputAmount},
      poolTokenIn: {assetId: pool.poolTokenID!, amount: poolTokenIn_bigInt},
      internalSwapQuote: {
        amountIn: {assetId: pool.asset2ID, amount: asset2OutputAmount},
        amountOut: {assetId: pool.asset1ID, amount: swapOutputAmount},
        swapFees: {assetId: pool.asset2ID, amount: totalFeeAmount},
        priceImpact
      }
    };
  } else if (assetOutID === pool.asset2ID) {
    const {swapOutputAmount, totalFeeAmount, priceImpact} =
      SwapV2.calculateFixedInputSwap({
        inputSupply: reserves.asset1 - asset1OutputAmount,
        outputSupply: reserves.asset2 - asset2OutputAmount,
        swapInputAmount: asset1OutputAmount,
        totalFeeShare,
        decimals
      });

    quote = {
      round: reserves.round,
      assetOut: {assetId: assetOutID, amount: asset2OutputAmount + swapOutputAmount},
      poolTokenIn: {assetId: pool.poolTokenID!, amount: poolTokenIn_bigInt},
      internalSwapQuote: {
        amountIn: {assetId: pool.asset2ID, amount: asset2OutputAmount},
        amountOut: {assetId: pool.asset1ID, amount: swapOutputAmount},
        swapFees: {assetId: pool.asset2ID, amount: totalFeeAmount},
        priceImpact
      }
    };
  } else {
    throw new Error("assetOutID must be one of the pool assets");
  }

  return quote;
}

function calculateRemoveLiquidityOutputAmounts(
  poolTokenIn: number | bigint,
  reserves: PoolReserves
) {
  let asset1OutputAmount: bigint, asset2OutputAmount: bigint;
  const poolTokenInBigInt = BigInt(poolTokenIn);
  const issuedPoolTokens = reserves.issuedLiquidity;

  if (issuedPoolTokens > poolTokenInBigInt + BigInt(V2_LOCKED_POOL_TOKENS)) {
    asset1OutputAmount = (poolTokenInBigInt * reserves.asset1) / issuedPoolTokens;
    asset2OutputAmount = (poolTokenInBigInt * reserves.asset2) / issuedPoolTokens;
  } else {
    asset1OutputAmount = reserves.asset1;
    asset2OutputAmount = reserves.asset2;
  }

  return {
    asset1OutputAmount,
    asset2OutputAmount
  };
}

/**
 * Generates transactions for multiple asset out remove liquidity operation
 */
async function generateTxns({
  client,
  pool,
  poolTokenIn,
  initiatorAddr,
  minAsset1Amount,
  minAsset2Amount,
  slippage
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  poolTokenIn: number | bigint;
  initiatorAddr: string;
  minAsset1Amount: number | bigint;
  minAsset2Amount: number | bigint;
  slippage: number;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const poolAddress = pool.account.address();
  const poolTokenId = pool.poolTokenID;

  if (!poolTokenId) {
    throw new Error("Pool token asset ID is missing");
  }

  const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: poolTokenId,
    amount: poolTokenIn,
    suggestedParams
  });

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: pool.validatorAppID,
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(CONTRACT_VERSION.V2),
    appArgs: [
      V2_REMOVE_LIQUIDITY_APP_ARGUMENT,
      algosdk.encodeUint64(applySlippageToAmount("negative", slippage, minAsset1Amount)),
      algosdk.encodeUint64(applySlippageToAmount("negative", slippage, minAsset2Amount))
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
  poolTokenIn,
  outputAssetId,
  minOutputAssetAmount,
  slippage
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  outputAssetId: number;
  poolTokenIn: number | bigint;
  initiatorAddr: string;
  minOutputAssetAmount: number | bigint;
  slippage: number;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const {asset1ID, asset2ID} = pool;
  const poolAddress = pool.account.address();
  const poolTokenId = pool.poolTokenID;

  if (!poolTokenId) {
    throw new Error("Pool token asset ID is missing");
  }

  let minAsset1Amount = 0 as number | bigint;
  let minAsset2Amount = 0 as number | bigint;

  const minOutputAssetAmountAfterSlippage = applySlippageToAmount(
    "negative",
    slippage,
    minOutputAssetAmount
  );

  if (outputAssetId === asset1ID) {
    minAsset1Amount = minOutputAssetAmountAfterSlippage;
    minAsset2Amount = 0;
  } else if (outputAssetId === asset2ID) {
    minAsset1Amount = 0;
    minAsset2Amount = minOutputAssetAmountAfterSlippage;
  } else {
    throw new Error("Invalid output asset id. It doesn't match with pool assets");
  }

  const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    assetIndex: poolTokenId,
    amount: poolTokenIn,
    suggestedParams
  });

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: pool.validatorAppID,
    note: tinymanJSSDKConfig.getAppCallTxnNoteWithClientName(CONTRACT_VERSION.V2),
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
  txGroup,
  signedTxns
}: {
  client: Algodv2;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
}): Promise<V2RemoveLiquidityExecution> {
  const [{txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);
  let outputAssets: AssetWithIdAndAmount[] | undefined;

  try {
    outputAssets = await getAppCallInnerAssetData(client, txGroup);
  } catch (_error) {
    // We can ignore this error since the main execution was successful
  }

  return {
    outputAssets,
    txnID
  };
}

export const RemoveLiquidityV2 = {
  getQuote,
  getSingleAssetRemoveLiquidityQuote,
  generateTxns,
  generateSingleAssetOutTxns,
  signTxns,
  execute
};
