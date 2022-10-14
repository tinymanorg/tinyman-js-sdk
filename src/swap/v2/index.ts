import algosdk, {Algodv2, Transaction} from "algosdk";

import {encodeString, isAlgo, roundNumber} from "../../util/util";
import {InitiatorSigner, SignerTransaction} from "../../util/commonTypes";
import TinymanError from "../../util/error/TinymanError";
import {PoolInfo, PoolReserves, PoolStatus} from "../../util/pool/poolTypes";
import {SwapQuote, SwapType} from "../types";

enum V2SwapTxnGroupIndices {
  /**
   * If the input asset is Algo, it'll be a payment txn, otherwise it'll be an asset transfer txn.
   */
  INPUT_TXN = 0,
  APP_CALL_TXN
}

const V2_SWAP_APP_CALL_INNER_TXN_COUNT = {
  [SwapType.FixedInput]: 1,
  [SwapType.FixedOutput]: 2
} as const;
const V2_SWAP_APP_CALL_ARG_ENCODED = encodeString("swap");
const V2_SWAP_APP_CALL_SWAP_TYPE_ARGS_ENCODED = {
  [SwapType.FixedInput]: encodeString("fixed-input"),
  [SwapType.FixedOutput]: encodeString("fixed-output")
} as const;

/**
 * Executes a swap with the desired quantities.
 */
function execute(_args: any, swapType: SwapType) {
  throw new Error("Not implemented");

  if (swapType === SwapType.FixedInput) {
    return executeFixedInputSwap(_args);
  }

  return executeFixedOutputSwap(_args);
}

/**
 * Executes a fixed input swap with the desired quantities.
 */
function executeFixedInputSwap(_args: any) {
  throw new Error("Not implemented");
}

/**
 * Executes a fixed output swap with the desired quantities.
 */
function executeFixedOutputSwap(_args: any) {
  throw new Error("Not implemented");
}

async function generateTxns({
  client,
  pool,
  swapType,
  assetIn,
  assetOut,
  initiatorAddr
}: {
  client: Algodv2;
  pool: PoolInfo;
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
      // TODO: How to encode this?
      encodeString(String(assetOut.amount))
    ],
    accounts: [poolAddress],
    foreignAssets: [pool.asset1ID, pool.asset2ID],
    suggestedParams: {
      ...suggestedParams,
      fee: await getSwapAppCallFeeAmount(client, swapType)
    }
  });

  let txns: Transaction[] = [];

  txns[V2SwapTxnGroupIndices.INPUT_TXN] = inputTxn;
  txns[V2SwapTxnGroupIndices.APP_CALL_TXN] = appCallTxn;

  const txGroup: algosdk.Transaction[] = algosdk.assignGroupID(txns);

  return [
    {txn: txGroup[V2SwapTxnGroupIndices.INPUT_TXN], signers: [initiatorAddr]},
    {txn: txGroup[V2SwapTxnGroupIndices.APP_CALL_TXN], signers: [poolAddress]}
  ];
}

async function signTxns({
  pool,
  txGroup,
  initiatorSigner
}: {
  pool: PoolInfo;
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

async function getSwapAppCallFeeAmount(client: Algodv2, swapType: SwapType) {
  const {fee: txnFee} = await client.getTransactionParams().do();
  // +1 to account for the outer txn fee
  const totalTxnCount = V2_SWAP_APP_CALL_INNER_TXN_COUNT[swapType] + 1;

  return txnFee * totalTxnCount;
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
  pool: PoolInfo,
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
  pool: PoolInfo;
  reserves: PoolReserves;
  assetIn: {assetID: number; amount: number | bigint};
  decimals: {assetIn: number; assetOut: number};
}): SwapQuote {
  /**
   * TODO: This fn is WIP
   * - [ ] Compare with v1 and py sdk v1
   * - [ ] Test; compare quotes with py sdk
   */
  console.log({decimals});

  const assetInAmount = BigInt(assetIn.amount);

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
    // TODO: What is total fee share?
    total_fee_share: 1 as any
  });

  return {
    round: reserves.round,
    assetInID: assetIn.assetID,
    assetInAmount,
    assetOutID,
    assetOutAmount: swap_output_amount,
    swapFee: Number(total_fee_amount),
    // slippage,
    rate: Number(swap_output_amount / assetInAmount),
    priceImpact: price_impact
  } as SwapQuote;
}

function calculateFixedInputSwap({
  input_supply,
  output_supply,
  swap_input_amount,
  total_fee_share
}: {
  input_supply: bigint;
  output_supply: bigint;
  swap_input_amount: bigint;
  total_fee_share: number;
}) {
  const total_fee_amount = calculate_fixed_input_fee_amount({
    input_amount: swap_input_amount,
    total_fee_share
  });
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
    swap_output_amount
  );

  return {swap_output_amount, total_fee_amount, price_impact};
}

function calculate_fixed_input_fee_amount({
  input_amount,
  total_fee_share
}: {
  input_amount: bigint;
  total_fee_share: number | bigint;
}) {
  const total_fee_amount = input_amount * BigInt(total_fee_share); // 10_000

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

function calculate_price_impact(
  input_supply: bigint,
  output_supply: bigint,
  swap_input_amount: bigint,
  swap_output_amount: bigint
): number {
  const swap_price = BigInt(swap_output_amount / swap_input_amount);
  const pool_price = output_supply / input_supply;
  const price_impact = roundNumber(
    {decimalPlaces: 5},
    Math.abs(Number(swap_price / pool_price) - 1)
  );

  return price_impact;
}

/**
 * @returns A quote for a fixed output swap. Does NOT execute any transactions.
 */
function getFixedOutputSwapQuote(params: {
  pool: PoolInfo;
  reserves: PoolReserves;
  assetOut: {assetID: number; amount: number | bigint};
  decimals: {assetIn: number; assetOut: number};
}): SwapQuote {
  console.log(params);
  throw new Error("Not implemented");
}

export const SwapV2 = {
  getQuote,
  generateTxns,
  signTxns,
  execute,
  executeFixedOutputSwap
};
