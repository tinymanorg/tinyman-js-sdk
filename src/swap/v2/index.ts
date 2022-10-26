import algosdk, {Algodv2, ALGORAND_MIN_TX_FEE, Transaction} from "algosdk";

import {
  convertFromBaseUnits,
  isAlgo,
  roundNumber,
  sendAndWaitRawTransaction
} from "../../util/util";
import {
  InitiatorSigner,
  SignerTransaction,
  SupportedNetwork
} from "../../util/commonTypes";
import TinymanError from "../../util/error/TinymanError";
import {PoolReserves, PoolStatus, V2PoolInfo} from "../../util/pool/poolTypes";
import {SwapQuote, SwapType} from "../types";
import {
  V2_SWAP_APP_CALL_ARG_ENCODED,
  V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED,
  V2SwapTxnGroupIndices,
  V2_SWAP_APP_CALL_INNER_TXN_COUNT
} from "./constants";
import {poolUtils} from "../../util/pool";

async function generateTxns({
  client,
  pool,
  swapType,
  assetIn,
  assetOut,
  initiatorAddr
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  swapType: SwapType;
  assetIn: {assetID: number; amount: number | bigint};
  assetOut: {assetID: number; amount: number | bigint};
  initiatorAddr: string;
}): Promise<SignerTransaction[]> {
  const suggestedParams = await client.getTransactionParams().do();
  const poolAddress = pool.account.address();
  const isAssetInAlgo = isAlgo(assetIn.assetID);

  /**
   * If the input asset is Algo, a payment txn, otherwise an asset transfer txn is required
   */
  const inputTxn = isAssetInAlgo
    ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: assetIn.amount,
        suggestedParams
      })
    : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolAddress,
        amount: assetIn.amount,
        assetIndex: assetIn.assetID,
        suggestedParams
      });

  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: initiatorAddr,
    appIndex: pool.validatorAppID!,
    appArgs: [
      V2_SWAP_APP_CALL_ARG_ENCODED,
      V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED[swapType],
      algosdk.encodeUint64(assetOut.amount)
    ],
    accounts: [poolAddress],
    foreignAssets: [pool.asset1ID, pool.asset2ID],
    suggestedParams: {
      ...suggestedParams,
      fee: getSwapAppCallFeeAmount(swapType)
    }
  });

  let txns: Transaction[] = [];

  txns[V2SwapTxnGroupIndices.INPUT_TXN] = inputTxn;
  txns[V2SwapTxnGroupIndices.APP_CALL_TXN] = appCallTxn;

  const txGroup: algosdk.Transaction[] = algosdk.assignGroupID(txns);

  return [
    {
      txn: txGroup[V2SwapTxnGroupIndices.INPUT_TXN],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[V2SwapTxnGroupIndices.APP_CALL_TXN],
      signers: [poolAddress]
    }
  ];
}

async function signTxns({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: V2PoolInfo;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  const [signedInputTxn] = await initiatorSigner([txGroup]);

  const signedTxns = txGroup.map((txDetail, index) => {
    if (index === V2SwapTxnGroupIndices.INPUT_TXN) {
      return signedInputTxn;
    }

    const {blob} = algosdk.signLogicSigTransactionObject(txDetail.txn, pool.account.lsig);

    return blob;
  });

  return signedTxns;
}

function getSwapAppCallFeeAmount(swapType: SwapType) {
  // Add +1 to account for the outer txn fee
  const totalTxnCount = V2_SWAP_APP_CALL_INNER_TXN_COUNT[swapType] + 1;

  return totalTxnCount * ALGORAND_MIN_TX_FEE;
}

interface V2SwapExecution {
  assetIn: {assetID: number; amount: number | bigint};
  assetOut: {assetID: number; amount: number | bigint};
  pool: V2PoolInfo;
  txnID: string;
  round: number;
}

/**
 * Executes a swap with the desired quantities.
 */
async function execute({
  client,
  pool,
  signedTxns,
  network,
  assetIn,
  assetOut
}: {
  client: Algodv2;
  pool: V2PoolInfo;
  network: SupportedNetwork;
  signedTxns: Uint8Array[];
  assetIn: {assetID: number; amount: number | bigint};
  assetOut: {assetID: number; amount: number | bigint};
}): Promise<V2SwapExecution> {
  let [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [signedTxns]);

  const updatedPoolInfo = await poolUtils.v2.getPoolInfo({
    client,
    network,
    asset1ID: pool.asset1ID,
    asset2ID: pool.asset2ID
  });

  return {
    round: confirmedRound,
    assetIn,
    assetOut,
    pool: updatedPoolInfo,
    txnID
  };
}

/**
 * @param type - Type of the swap
 * @param pool - Information for the pool.
 * @param reserves - Pool reserves.
 * @param asset.assetID - ID of the asset to be swapped
 * @param asset.amount - Amount of the asset to be swapped
 * @param decimals.assetIn - Decimals quantity for the input asset
 * @param decimals.assetOut - Decimals quantity for the output asset
 * @returns A promise for the Swap quote
 */
function getQuote(
  type: SwapType,
  pool: V2PoolInfo,
  reserves: PoolReserves,
  asset: {assetID: number; amount: number | bigint},
  decimals: {assetIn: number; assetOut: number}
): SwapQuote {
  let quote: SwapQuote;

  if (pool.status !== PoolStatus.READY) {
    throw new TinymanError({pool, asset}, "Trying to swap on a non-existent pool");
  }

  if (type === SwapType.FixedInput) {
    quote = getFixedInputSwapQuote({pool, reserves, assetIn: asset, decimals});
  } else {
    quote = getFixedOutputSwapQuote({pool, reserves, assetOut: asset, decimals});
  }

  return quote;
}

/**
 * @returns A quote for a fixed input swap. Does NOT execute any transactions.
 */
function getFixedInputSwapQuote({
  pool,
  reserves,
  assetIn,
  decimals
}: {
  pool: V2PoolInfo;
  reserves: PoolReserves;
  assetIn: {assetID: number; amount: number | bigint};
  decimals: {assetIn: number; assetOut: number};
}): SwapQuote {
  if (pool.status !== PoolStatus.READY) {
    throw new TinymanError({pool, assetIn}, "Trying to swap on a non-existent pool");
  }

  const assetInAmount = BigInt(assetIn.amount);
  // TODO: remove `!` once pool info shape is updated
  const totalFeeShare = pool.totalFeeShare!;

  let assetOutID: number;
  let inputSupply: bigint;
  let outputSupply: bigint;

  if (assetIn.assetID === pool.asset1ID) {
    assetOutID = pool.asset2ID;
    inputSupply = reserves.asset1;
    outputSupply = reserves.asset2;
  } else {
    assetOutID = pool.asset1ID;
    inputSupply = reserves.asset2;
    outputSupply = reserves.asset1;
  }

  const {swap_output_amount, total_fee_amount, price_impact} = calculateFixedInputSwap({
    input_supply: inputSupply,
    output_supply: outputSupply,
    swap_input_amount: assetInAmount,
    total_fee_share: totalFeeShare,
    decimals
  });

  return {
    round: reserves.round,
    assetInID: assetIn.assetID,
    assetInAmount,
    assetOutID,
    assetOutAmount: swap_output_amount,
    swapFee: Number(total_fee_amount),
    // slippage,
    rate:
      convertFromBaseUnits(decimals.assetOut, Number(swap_output_amount)) /
      convertFromBaseUnits(decimals.assetIn, Number(assetInAmount)),
    priceImpact: price_impact
  };
}

/**
 * @returns A quote for a fixed output swap. Does NOT execute any transactions.
 */
function getFixedOutputSwapQuote({
  pool,
  reserves,
  assetOut,
  decimals
}: {
  pool: V2PoolInfo;
  reserves: PoolReserves;
  assetOut: {assetID: number; amount: number | bigint};
  decimals: {assetIn: number; assetOut: number};
}): SwapQuote {
  const assetOutAmount = BigInt(assetOut.amount);
  // TODO: remove `!` once pool info shape is updated
  const totalFeeShare = pool.totalFeeShare!;
  let assetInID: number;
  let inputSupply: bigint;
  let outputSupply: bigint;

  // check this again
  if (assetOut.assetID === pool.asset1ID) {
    assetInID = pool.asset2ID;
    inputSupply = reserves.asset2;
    outputSupply = reserves.asset1;
  } else {
    assetInID = pool.asset1ID;
    inputSupply = reserves.asset1;
    outputSupply = reserves.asset2;
  }

  const {swap_input_amount, total_fee_amount, price_impact} = calculateFixedOutputSwap({
    input_supply: inputSupply,
    output_supply: outputSupply,
    swap_output_amount: assetOutAmount,
    total_fee_share: totalFeeShare,
    decimals
  });

  return {
    round: reserves.round,
    assetInID,
    assetInAmount: swap_input_amount,
    assetOutID: assetOut.assetID,
    assetOutAmount,
    swapFee: Number(total_fee_amount),
    // TODO: do we need slippage?
    // slippage,
    rate:
      convertFromBaseUnits(decimals.assetOut, Number(assetOutAmount)) /
      convertFromBaseUnits(decimals.assetIn, Number(swap_input_amount)),
    priceImpact: price_impact
  };
}

function calculateFixedInputSwap({
  input_supply,
  output_supply,
  swap_input_amount,
  total_fee_share,
  decimals
}: {
  input_supply: bigint;
  output_supply: bigint;
  swap_input_amount: bigint;
  total_fee_share: bigint;
  decimals: {assetIn: number; assetOut: number};
}) {
  const total_fee_amount = BigInt(
    calculate_fixed_input_fee_amount({
      input_amount: swap_input_amount,
      total_fee_share
    })
  );
  const swap_amount = swap_input_amount - total_fee_amount;
  const swap_output_amount = calculate_output_amount_of_fixed_input_swap(
    input_supply,
    output_supply,
    swap_amount
  );

  const price_impact = calculate_price_impact(
    input_supply,
    output_supply,
    swap_input_amount,
    swap_output_amount,
    decimals
  );

  return {swap_output_amount, total_fee_amount, price_impact};
}

function calculateFixedOutputSwap({
  input_supply,
  output_supply,
  swap_output_amount,
  total_fee_share,
  decimals
}: {
  input_supply: bigint;
  output_supply: bigint;
  swap_output_amount: bigint;
  total_fee_share: bigint;
  decimals: {assetIn: number; assetOut: number};
}) {
  const swap_amount = calculate_swap_amount_of_fixed_output_swap(
    input_supply,
    output_supply,
    swap_output_amount
  );
  const total_fee_amount = calculate_fixed_output_fee_amount({
    swap_amount,
    total_fee_share
  });
  const swap_input_amount = swap_amount + total_fee_amount;

  const price_impact = calculate_price_impact(
    input_supply,
    output_supply,
    swap_input_amount,
    swap_output_amount,
    decimals
  );

  return {swap_input_amount, total_fee_amount, price_impact};
}

function calculate_fixed_input_fee_amount({
  input_amount,
  total_fee_share
}: {
  input_amount: bigint;
  total_fee_share: bigint;
}) {
  return Math.floor(Number(input_amount * BigInt(total_fee_share)) / 10_000);
}

function calculate_fixed_output_fee_amount({
  swap_amount,
  total_fee_share
}: {
  swap_amount: bigint;
  total_fee_share: bigint;
}) {
  const input_amount = Math.floor(
    Number((swap_amount * BigInt(10_000)) / (BigInt(10_000) - BigInt(total_fee_share)))
  );
  const total_fee_amount = BigInt(input_amount) - swap_amount;

  return total_fee_amount;
}

function calculate_output_amount_of_fixed_input_swap(
  input_supply: bigint,
  output_supply: bigint,
  swap_amount: bigint
): bigint {
  const k = input_supply * output_supply;
  let output_amount = output_supply - BigInt(k / (input_supply + BigInt(swap_amount)));

  output_amount -= BigInt(1);

  return output_amount;
}

function calculate_swap_amount_of_fixed_output_swap(
  input_supply: bigint,
  output_supply: bigint,
  output_amount: bigint
): bigint {
  const k = input_supply * output_supply;
  let swap_amount = BigInt(k / (output_supply - output_amount)) - input_supply;

  swap_amount += BigInt(1);

  return swap_amount;
}

function calculate_price_impact(
  input_supply: bigint,
  output_supply: bigint,
  swap_input_amount: bigint,
  swap_output_amount: bigint,
  decimals: {assetIn: number; assetOut: number}
): number {
  const swap_price =
    convertFromBaseUnits(decimals.assetOut, Number(swap_output_amount)) /
    convertFromBaseUnits(decimals.assetIn, Number(swap_input_amount));
  const pool_price =
    convertFromBaseUnits(decimals.assetOut, Number(output_supply)) /
    convertFromBaseUnits(decimals.assetIn, Number(input_supply));
  const price_impact = roundNumber(
    {decimalPlaces: 5},
    Math.abs(swap_price / pool_price - 1)
  );

  return price_impact;
}

export const SwapV2 = {
  getQuote,
  generateTxns,
  signTxns,
  execute,
  calculateFixedInputSwap
};
