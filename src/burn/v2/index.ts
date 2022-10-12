import algosdk, {Algodv2, Transaction} from "algosdk";

import {tinymanContract_v2} from "../../contract/contract";
import {
  SignerTransaction,
  InitiatorSigner,
  SupportedNetwork
} from "../../util/commonTypes";
import {PoolInfo, PoolReserves} from "../../util/pool/poolTypes";
import {encodeString} from "../../util/util";
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
  liquidityIn
}: {
  pool: PoolInfo;
  reserves: PoolReserves;
  liquidityIn: number | bigint;
}): BurnQuote {
  /**
   * TODO: Will this work same with v1?
   */
  const liquidityIn_bigInt = BigInt(liquidityIn);

  const asset1Out =
    reserves.issuedLiquidity &&
    (liquidityIn_bigInt * reserves.asset1) / reserves.issuedLiquidity;
  const asset2Out =
    reserves.issuedLiquidity &&
    (liquidityIn_bigInt * reserves.asset2) / reserves.issuedLiquidity;

  return {
    round: reserves.round,
    liquidityID: pool.liquidityTokenID!,
    liquidityIn: liquidityIn_bigInt,
    asset1ID: pool.asset1ID,
    asset1Out,
    asset2ID: pool.asset2ID,
    asset2Out
  };
}

/**
 * MULTIPLE ASSET OUT
 * py-sdk reference: prepare_remove_liquidity_transactions
 * doc reference: https://docs.google.com/document/d/1O3QBkWmUDoaUM63hpniqa2_7G_6wZcCpkvCqVrGrDlc/edit#heading=h.pwio5v1fkpcj
 */
async function generateRemoveLiquidityTxns({
  client,
  pool,
  liquidityIn,
  initiatorAddr,
  minAsset1Amount,
  minAsset2Amount
}: {
  client: Algodv2;
  pool: PoolInfo;
  liquidityIn: number | bigint;
  initiatorAddr: string;
  minAsset1Amount: number | bigint;
  minAsset2Amount: number | bigint;
}): Promise<SignerTransaction[]> {
  /**
   * TODO: Refactor: most of this is the same with single out
   */

  const suggestedParams = await client.getTransactionParams().do();
  const poolAddress = pool.account.address();

  const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolAddress,
    // TODO: what if liquidityTokenID is falsy?
    assetIndex: pool.liquidityTokenID!,
    // TODO: is amt value true? Is it same with `pool_token_asset_amount` in py sdk?
    amount: liquidityIn,
    suggestedParams
  });

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: pool.validatorAppID,
    appArgs: [
      V2_REMOVE_LIQUIDITY_APP_ARGUMENT,

      // TODO: Probably these encoding won't work for int
      encodeString(String(minAsset1Amount)),
      encodeString(String(minAsset2Amount))
    ],
    accounts: [poolAddress],
    foreignAssets: [pool.asset1ID, pool.asset2ID],
    suggestedParams: {
      ...suggestedParams,
      // Add +1 for outer txn cost
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
    {txn: txGroup[V2RemoveLiquidityTxnIndices.APP_CALL_TXN], signers: [poolAddress]}
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
  outputAssetId,
  liquidityIn,
  initiatorAddr,
  minOutputAssetAmount
}: {
  client: Algodv2;
  pool: PoolInfo;
  outputAssetId: number;
  liquidityIn: number | bigint;
  initiatorAddr: string;
  minOutputAssetAmount: number | bigint;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const {asset1ID, asset2ID} = pool;
  const poolAddress = pool.account.address();

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
    // TODO: what if liquidityTokenID is falsy?
    assetIndex: pool.liquidityTokenID!,
    // TODO: is amt value true?
    amount: liquidityIn,
    suggestedParams
  });

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: pool.validatorAppID,
    appArgs: [
      V2_REMOVE_LIQUIDITY_APP_ARGUMENT,
      // TODO: Probably these encoding won't work for int
      encodeString(String(minAsset1Amount)),
      encodeString(String(minAsset2Amount))
    ],
    accounts: [poolAddress],
    foreignAssets: [pool.asset1ID, pool.asset2ID],
    suggestedParams: {
      ...suggestedParams,
      // Add +1 for outer txn cost
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
    {txn: txGroup[V2RemoveLiquidityTxnIndices.APP_CALL_TXN], signers: [poolAddress]}
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

function execute(_args: any) {
  // TODO
  throw new Error("Method not implemented.");
}

export const BurnV2 = {
  getQuote,
  generateRemoveLiquidityTxns,
  generateSingleAssetOutRemoveLiquidityTxns,
  signTxns,
  execute
};
