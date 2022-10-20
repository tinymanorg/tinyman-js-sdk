import algosdk, {Algodv2, ALGORAND_MIN_TX_FEE, Transaction} from "algosdk";

import {tinymanContract_v2} from "../../contract/v2/contract";
import {
  SignerTransaction,
  InitiatorSigner,
  SupportedNetwork
} from "../../util/commonTypes";
import {PoolInfo, PoolReserves} from "../../util/pool/poolTypes";
import {sendAndWaitRawTransaction} from "../../util/util";
import {
  V2RemoveLiquidityTxnIndices,
  V2_REMOVE_LIQUIDITY_APP_ARGUMENT,
  V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT
} from "./constants";

/** An object containing information about a burn quote. */
export interface BurnQuote {
  /** The round that this quote is based on. */
  round: number;
  /** The ID of the first output asset in this quote. */
  asset1ID: number;
  /** The quantity of the first output asset in this quote. */
  asset1Out: bigint;
  /** The ID of the second output asset in this quote. */
  asset2ID: number;
  /** The quantity of the second output asset in this quote. */
  asset2Out: bigint;
  /** The ID of the input liquidity token asset in this quote. */
  liquidityID: number;
  /** The quantity of the input liquidity token asset in this quote. */
  liquidityIn: bigint;
}

/**
 * Get a quote for how many of assets 1 and 2 a deposit of liquidityIn is worth at this moment. This
 * does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.liquidityIn The quantity of the liquidity being deposited.
 */
export function getQuote({
  pool,
  reserves,
  /**
   * previously `liquidityIn`
   */
  poolTokenAssetIn
}: {
  pool: PoolInfo;
  reserves: PoolReserves;
  poolTokenAssetIn: number | bigint;
}): BurnQuote {
  const poolTokenAssetIn_bigInt = BigInt(poolTokenAssetIn);
  const {asset_1_output_amount, asset_2_output_amount} =
    calculateRemoveLiquidityOutputAmounts(poolTokenAssetIn_bigInt, reserves);

  return {
    round: reserves.round,
    liquidityID: pool.liquidityTokenID!,
    liquidityIn: poolTokenAssetIn_bigInt,
    asset1ID: pool.asset1ID,
    asset1Out: asset_1_output_amount,
    asset2ID: pool.asset2ID,
    asset2Out: asset_2_output_amount
  };
}

export function getSingleAssetRemoveLiquidityQuote({
  pool,
  reserves,
  /**
   * previously `liquidityIn`
   */
  poolTokenAssetIn,
  assetOutID
}: {
  pool: PoolInfo;
  reserves: PoolReserves;
  poolTokenAssetIn: number | bigint;
  assetOutID: number;
}): BurnQuote {
  const poolTokenAssetIn_bigInt = BigInt(poolTokenAssetIn);
  const {asset_1_output_amount, asset_2_output_amount} =
    calculateRemoveLiquidityOutputAmounts(poolTokenAssetIn_bigInt, reserves);

  console.log({assetOutID});
  /**
   * TODO: For the rest of this function, we need new swap utils.
   * See: `fetch_single_asset_remove_liquidity_quote` in py sdk
   */

  throw new Error("Not completely implemented.");

  return {
    round: reserves.round,
    liquidityID: pool.liquidityTokenID!,
    liquidityIn: poolTokenAssetIn_bigInt,
    asset1ID: pool.asset1ID,
    asset1Out: asset_1_output_amount,
    asset2ID: pool.asset2ID,
    asset2Out: asset_2_output_amount
  };
}

// TODO: what is this?
const LOCKED_POOL_TOKENS = 1000;

function calculateRemoveLiquidityOutputAmounts(
  pool_token_asset_amount: number | bigint,
  reserves: PoolReserves
) {
  let asset_1_output_amount: bigint, asset_2_output_amount: bigint;
  const poolTokenAssetAmountBigInt = BigInt(pool_token_asset_amount);
  const issuedPoolTokens = reserves.issuedLiquidity;

  if (issuedPoolTokens > poolTokenAssetAmountBigInt + BigInt(LOCKED_POOL_TOKENS)) {
    asset_1_output_amount =
      (poolTokenAssetAmountBigInt * reserves.asset1) / issuedPoolTokens;
    asset_2_output_amount =
      (poolTokenAssetAmountBigInt * reserves.asset1) / issuedPoolTokens;
  } else {
    asset_1_output_amount = reserves.asset1;
    asset_2_output_amount = reserves.asset2;
  }

  return {asset_1_output_amount, asset_2_output_amount};
}
/**
 * MULTIPLE ASSET OUT
 * py-sdk reference: prepare_remove_liquidity_transactions
 * doc reference: https://docs.google.com/document/d/1O3QBkWmUDoaUM63hpniqa2_7G_6wZcCpkvCqVrGrDlc/edit#heading=h.pwio5v1fkpcj
 */
async function generateRemoveLiquidityTxns({
  client,
  pool,
  poolTokenAssetAmount,
  initiatorAddr,
  minAsset1Amount,
  minAsset2Amount
}: {
  client: Algodv2;
  pool: PoolInfo;
  /**
   * previously: `liquidityIn`
   */
  poolTokenAssetAmount: number | bigint;
  initiatorAddr: string;
  minAsset1Amount: number | bigint;
  minAsset2Amount: number | bigint;
}): Promise<SignerTransaction[]> {
  /**
   * TODO: Refactor: most of this is the same with single out
   */

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
    suggestedParams: {
      ...suggestedParams,
      // Add + 1 for outer txn cost
      fee: (V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT + 1) * ALGORAND_MIN_TX_FEE
    }
  });

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
      signers: [poolAddress]
    }
  ];
}

/**
 * SINGLE ASSET OUT
 * py-sdk reference: prepare_single_asset_remove_liquidity_transactions
 * doc reference: https://docs.google.com/document/d/1O3QBkWmUDoaUM63hpniqa2_7G_6wZcCpkvCqVrGrDlc/edit#heading=h.sr7e79a28ufn
 */
async function generateSingleAssetOutRemoveLiquidityTxns({
  client,
  pool,
  initiatorAddr,
  poolTokenAssetAmount,
  outputAssetId,
  minOutputAssetAmount
}: {
  client: Algodv2;
  pool: PoolInfo;
  outputAssetId: number;
  /**
   * previously: `liquidityIn`
   */
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
    // TODO: is amt value true?
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
    suggestedParams: {
      ...suggestedParams,
      // Add + 1 for outer txn cost
      fee: (V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT + 1) * suggestedParams.fee
    }
  });

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
      signers: [poolAddress]
    }
  ];
}

async function signTxns({
  pool,
  network,
  txGroup,
  initiatorSigner
}: {
  pool: PoolInfo;
  network: SupportedNetwork;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  const [signedAssetTransferTxn] = await initiatorSigner([txGroup]);
  const poolLogicSig = tinymanContract_v2.generateLogicSigAccountForPool({
    network,
    asset1ID: pool.asset1ID,
    asset2ID: pool.asset2ID
  });

  const signedTxns = txGroup.map((txDetail, index) => {
    if (index === V2RemoveLiquidityTxnIndices.ASSET_TRANSFER_TXN) {
      return signedAssetTransferTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txDetail.txn, poolLogicSig);

    return blob;
  });

  return signedTxns;
}

async function execute({
  client,
  // pool,
  // txGroup,
  signedTxns
}: // initiatorAddr
{
  client: any;
  // pool: PoolInfo;
  // txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
  // initiatorAddr: string;
}) {
  const [data] = await sendAndWaitRawTransaction(client, [signedTxns]);

  console.log({
    data
  });

  return {
    // round: confirmedRound,
    // txnID,
    data
  };
}

export const BurnV2 = {
  getQuote,
  generateRemoveLiquidityTxns,
  generateSingleAssetOutRemoveLiquidityTxns,
  signTxns,
  execute
};
