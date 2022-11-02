import algosdk, {ALGORAND_MIN_TX_FEE} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {CONTRACT_VERSION} from "../../contract/constants";
import {isAlgo} from "../../util/asset/assetUtils";
import {SupportedNetwork} from "../../util/commonTypes";
import {PoolReserves, V2PoolInfo} from "../../util/pool/poolTypes";
import {getValidatorAppID} from "../../validator";
import {MINT_APP_CALL_ARGUMENTS, V2_MINT_INNER_TXN_COUNT} from "../constants";
import {calculateInitialAddLiquidity} from "./util";
export * from "./common";

//  TO-DO: Add types
export function getQuote({
  pool,
  reserves,
  asset1In,
  asset2In,
  slippage = 0.05
}: {
  pool: V2PoolInfo;
  reserves: PoolReserves;
  asset1In: number | bigint;
  asset2In: number | bigint;
  slippage?: number;
}) {
  if (reserves.issuedLiquidity !== 0n) {
    throw new Error("Pool already has liquidity");
  }

  const poolTokenAssetAmount = calculateInitialAddLiquidity(asset1In, asset2In);

  return {
    assetInID: pool.asset1ID,
    assetOutID: pool.asset2ID,
    assetInAmount: BigInt(asset1In),
    assetOutAmount: BigInt(asset2In),
    poolTokenAssetAmount,
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
    appArgs: MINT_APP_CALL_ARGUMENTS.v2.INITIAL_LIQUIDITY,
    accounts: [poolAddress],
    foreignAssets: [liquidityToken.id],
    suggestedParams: {
      ...suggestedParams,
      // Add +1 to account for the fee of the outer txn
      fee: (V2_MINT_INNER_TXN_COUNT.INITIAL_LIQUIDITY + 1) * ALGORAND_MIN_TX_FEE
    }
  });

  //  TODO: return txns ungrouped
  const txGroup = algosdk.assignGroupID([asset1InTxn, asset2InTxn, validatorAppCallTxn]);

  return [
    {
      txn: txGroup[0],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[1],
      signers: [initiatorAddr]
    },
    {
      txn: txGroup[2],
      signers: [initiatorAddr]
    }
  ];
}
