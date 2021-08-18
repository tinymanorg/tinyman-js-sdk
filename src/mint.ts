import algosdk, {Transaction} from "algosdk";

import {
  applySlippageToAmount,
  getTxnGroupID,
  sendAndWaitRawTransaction,
  sumUpTxnFees
} from "./util";
import {
  MINIMUM_LIQUIDITY,
  PoolInfo,
  getPoolReserves,
  getAccountExcess,
  getPoolShare
} from "./pool";
import {InitiatorSigner} from "./common-types";
import {ALGO_ASSET_ID, DEFAULT_FEE_TXN_NOTE} from "./constant";

/** An object containing information about a mint quote. */
export interface MintQuote {
  /** The round that this quote is based on. */
  round: number;
  /** The ID of the first input asset in this quote. */
  asset1ID: number;
  /** The quantity of the first input asset in this quote. */
  asset1In: bigint;
  /** The ID of the second input asset in this quote. */
  asset2ID: number;
  /** The quantity of the second input asset in this quote. */
  asset2In: bigint;
  /** The ID of the liquidity token output in this quote. */
  liquidityID: number;
  /** The amount of the liquidity token output in this quote. */
  liquidityOut: bigint;
  /** The share of the total liquidity in this quote. */
  share: number;
}

/** An object containing information about a successfully executed mint transaction. */
export interface MintExecution {
  /** The round that the mint occurred in. */
  round: number;
  /**
   * The total amount of transaction fees that were spent (in microAlgos) to execute the mint and,
   * if applicable, redeem transactions.
   */
  fees: number;
  /** The ID of the output liquidity token asset. */
  liquidityID: number;
  /** The quantity of the output liquidity token asset. */
  liquidityOut: bigint;
  excessAmount: {
    /** Excess amount for the current swap */
    excessAmountForMinting: bigint;
    /** Total excess amount accumulated for the pool asset */
    totalExcessAmount: bigint;
  };
  /** The ID of the transaction. */
  txnID: string;
  /** The group ID for the transaction group. */
  groupID: string;
}

enum MintTxnIndices {
  FEE_TXN = 0,
  VALIDATOR_APP_CALL_TXN,
  ASSET1_IN_TXN,
  ASSET2_IN_TXN,
  LIQUDITY_OUT_TXN
}

export const MINT_PROCESS_TOTAL_FEE = 5000;

/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 */
export async function getMintLiquidityQuote({
  client,
  pool,
  asset1In,
  asset2In
}: {
  client: any;
  pool: PoolInfo;
  asset1In: number | bigint;
  asset2In: number | bigint;
}): Promise<MintQuote> {
  const reserves = await getPoolReserves(client, pool);

  if (reserves.issuedLiquidity === 0n) {
    // TODO: compute sqrt on bigints
    const geoMean = BigInt(Math.floor(Math.sqrt(Number(asset1In) * Number(asset2In))));

    if (geoMean <= BigInt(MINIMUM_LIQUIDITY)) {
      throw new Error(
        `Initial liquidity mint too small. Liquidity minting amount must be greater than ${MINIMUM_LIQUIDITY}, this quote is for ${geoMean}.`
      );
    }

    return {
      round: reserves.round,
      asset1ID: pool.asset1ID,
      asset1In: BigInt(asset1In),
      asset2ID: pool.asset2ID,
      asset2In: BigInt(asset2In),
      liquidityID: pool.liquidityTokenID!,
      liquidityOut: geoMean - BigInt(MINIMUM_LIQUIDITY),
      share: 1
    };
  }

  const asset1Ratio = (BigInt(asset1In) * reserves.issuedLiquidity) / reserves.asset1;
  const asset2Ratio = (BigInt(asset2In) * reserves.issuedLiquidity) / reserves.asset2;
  const liquidityOut = asset1Ratio < asset2Ratio ? asset1Ratio : asset2Ratio;

  return {
    round: reserves.round,
    asset1ID: pool.asset1ID,
    asset1In: BigInt(asset1In),
    asset2ID: pool.asset2ID,
    asset2In: BigInt(asset2In),
    liquidityID: pool.liquidityTokenID!,
    liquidityOut,
    share: getPoolShare(reserves.issuedLiquidity + liquidityOut, liquidityOut)
  };
}

const MINT_ENCODED = Uint8Array.from([109, 105, 110, 116]); // 'mint'

export async function generateMintTxns({
  client,
  pool,
  asset1In,
  asset2In,
  liquidityOut,
  slippage,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  asset1In: number | bigint;
  asset2In: number | bigint;
  liquidityOut: number | bigint;
  slippage: number;
  initiatorAddr: string;
}) {
  // apply slippage to liquidity out amount
  const liquidityOutAmount = applySlippageToAmount("negative", slippage, liquidityOut);

  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: pool.addr,
    appIndex: pool.validatorAppID,
    appArgs: [MINT_ENCODED],
    accounts: [initiatorAddr],
    foreignAssets:
      pool.asset2ID == ALGO_ASSET_ID
        ? [pool.asset1ID, <number>pool.liquidityTokenID]
        : [pool.asset1ID, pool.asset2ID, <number>pool.liquidityTokenID],
    suggestedParams
  });

  const asset1InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    assetIndex: pool.asset1ID,
    amount: asset1In,
    suggestedParams
  });

  let asset2InTxn;

  if (pool.asset2ID === ALGO_ASSET_ID) {
    asset2InTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: pool.addr,
      amount: asset2In,
      suggestedParams
    });
  } else {
    asset2InTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: initiatorAddr,
      to: pool.addr,
      assetIndex: pool.asset2ID,
      amount: asset2In,
      suggestedParams
    });
  }

  const liquidityOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: pool.addr,
    to: initiatorAddr,
    assetIndex: <number>pool.liquidityTokenID,
    amount: liquidityOutAmount,
    suggestedParams
  });

  const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    amount: validatorAppCallTxn.fee + liquidityOutTxn.fee,
    note: DEFAULT_FEE_TXN_NOTE, // just here to make this unique from asset1In if necessary
    suggestedParams
  });

  return algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    asset1InTxn,
    asset2InTxn,
    liquidityOutTxn
  ]);
}

export async function signMintTxns({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: PoolInfo;
  txGroup: Transaction[];
  initiatorSigner: InitiatorSigner;
}) {
  const lsig = algosdk.makeLogicSig(pool.program);
  const [signedFeeTxn, signedAsset1InTxn, signedAsset2InTxn] = await initiatorSigner([
    txGroup[MintTxnIndices.FEE_TXN],
    txGroup[MintTxnIndices.ASSET1_IN_TXN],
    txGroup[MintTxnIndices.ASSET2_IN_TXN]
  ]);

  const signedTxns = txGroup.map((txn, index) => {
    if (index === MintTxnIndices.FEE_TXN) {
      return signedFeeTxn;
    }
    if (index === MintTxnIndices.ASSET1_IN_TXN) {
      return signedAsset1InTxn;
    }
    if (index === MintTxnIndices.ASSET2_IN_TXN) {
      return signedAsset2InTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txn, lsig);

    return blob;
  });

  return signedTxns;
}

/**
 * Execute a mint operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.liquidityOut The quantity of liquidity tokens being withdrawn.
 * @param params.slippage The maximum acceptable slippage rate. Should be a number between 0 and 100
 *   and acts as a percentage of params.liquidityOut.
 * @param params.initiatorAddr The address of the account performing the mint operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function mintLiquidity({
  client,
  pool,
  txGroup,
  signedTxns,
  initiatorAddr
}: {
  client: any;
  pool: PoolInfo;
  txGroup: Transaction[];
  signedTxns: Uint8Array[];
  initiatorAddr: string;
}): Promise<MintExecution> {
  const liquidityOutAmount = BigInt(txGroup[MintTxnIndices.LIQUDITY_OUT_TXN].amount);

  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  const {confirmedRound, txnID} = await sendAndWaitRawTransaction(client, signedTxns);
  const fees = sumUpTxnFees(txGroup);
  const groupID = getTxnGroupID(txGroup);

  const excessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let excessAmountDelta =
    excessAssets.excessLiquidityTokens - prevExcessAssets.excessLiquidityTokens;

  if (excessAmountDelta < 0n) {
    excessAmountDelta = 0n;
  }

  return {
    round: confirmedRound,
    fees,
    liquidityID: pool.liquidityTokenID!,
    liquidityOut: liquidityOutAmount + excessAmountDelta,
    excessAmount: {
      excessAmountForMinting: excessAmountDelta,
      totalExcessAmount: excessAssets.excessLiquidityTokens
    },
    txnID,
    groupID
  };
}
