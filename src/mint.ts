import algosdk from "algosdk";

import {applySlippageToAmount, bufferToBase64, waitForTransaction} from "./util";
import {
  MINIMUM_LIQUIDITY,
  PoolInfo,
  getPoolReserves,
  getAccountExcess,
  getPoolShare
} from "./pool";
import {InitiatorSigner} from "./common-types";

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
  /** The ID of the first input asset. */
  asset1ID: number;
  /** The quantity of the first input asset. */
  asset1In: bigint;
  /** The ID of the second input asset. */
  asset2ID: number;
  /** The quantity of the second input asset. */
  asset2In: bigint;
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

async function doMint({
  client,
  pool,
  asset1In,
  asset2In,
  liquidityOut,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  asset1In: number | bigint;
  asset2In: number | bigint;
  liquidityOut: number | bigint;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<{
  fees: number;
  confirmedRound: number;
  txnID: string;
  groupID: string;
}> {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: pool.addr,
    appIndex: pool.validatorAppID,
    appArgs: [MINT_ENCODED],
    accounts: [initiatorAddr],
    foreignAssets:
      // eslint-disable-next-line eqeqeq
      pool.asset2ID == 0
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

  if (pool.asset2ID === 0) {
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
    amount: liquidityOut,
    suggestedParams
  });

  let txnFees = validatorAppCallTxn.fee + liquidityOutTxn.fee;

  const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: pool.addr,
    amount: txnFees,
    note: Uint8Array.from([1]), // just here to make this unique from asset1In if necessary
    suggestedParams
  });

  txnFees += asset1InTxn.fee + asset2InTxn.fee + feeTxn.fee;

  const txGroup: any[] = algosdk.assignGroupID([
    feeTxn,
    validatorAppCallTxn,
    asset1InTxn,
    asset2InTxn,
    liquidityOutTxn
  ]);

  const lsig = algosdk.makeLogicSig(pool.program);
  const [signedFeeTxn, signedAsset1InTxn, signedAsset2InTxn] = await initiatorSigner([
    txGroup[0],
    txGroup[2],
    txGroup[3]
  ]);

  const signedTxns = txGroup.map((txn, index) => {
    if (index === 0) {
      return signedFeeTxn;
    }
    if (index === 2) {
      return signedAsset1InTxn;
    }
    if (index === 3) {
      return signedAsset2InTxn;
    }
    const {blob} = algosdk.signLogicSigTransactionObject(txn, lsig);

    return blob;
  });

  const {txId} = await client.sendRawTransaction(signedTxns).do();

  const status = await waitForTransaction(client, txId);
  const confirmedRound: number = status["confirmed-round"];

  return {
    fees: txnFees,
    confirmedRound,
    txnID: txId,
    groupID: bufferToBase64(txGroup[0].group)
  };
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
  asset1In,
  asset2In,
  liquidityOut,
  slippage,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  asset1In: number | bigint;
  asset2In: number | bigint;
  liquidityOut: number | bigint;
  slippage: number;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<MintExecution> {
  // apply slippage to liquidity out amount
  const liquidityOutAmount = applySlippageToAmount("negative", slippage, liquidityOut);

  const prevExcessAssets = await getAccountExcess({
    client,
    pool,
    accountAddr: initiatorAddr
  });

  let {fees, confirmedRound, txnID, groupID} = await doMint({
    client,
    pool,
    asset1In,
    asset2In,
    liquidityOut: liquidityOutAmount,
    initiatorAddr,
    initiatorSigner
  });

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
    asset1ID: pool.asset1ID,
    asset1In: BigInt(asset1In),
    asset2ID: pool.asset2ID,
    asset2In: BigInt(asset2In),
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
