import algosdk, {ALGORAND_MIN_TX_FEE} from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";

import {MINT_APP_CALL_ARGUMENTS, V2_MINT_INNER_TXN_COUNT} from "../constants";
import {CONTRACT_VERSION} from "../../contract/constants";
import {
  InitiatorSigner,
  SignerTransaction,
  SupportedNetwork
} from "../../util/commonTypes";
import TinymanError from "../../util/error/TinymanError";
import {PoolInfo} from "../../util/pool/poolTypes";
import {getTxnGroupID, sendAndWaitRawTransaction, sumUpTxnFees} from "../../util/util";
import {getValidatorAppID} from "../../validator";
import {MintExecution, MintTxnIndices} from "../types";
import {isAlgo} from "../../util/asset/assetUtils";

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
  pool: PoolInfo;
  network: SupportedNetwork;
  poolAddress: string;
  asset_1: {id: number; amount: number | bigint};
  asset_2: {id: number; amount: number | bigint};
  liquidityToken: {id: number; amount: number | bigint};
  slippage: number;
  initiatorAddr: string;
}) {
  const suggestedParams = await client.getTransactionParams().do();
  const isAlgoPool = isAlgo(asset_2.id);
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
    from: poolAddress,
    appIndex: getValidatorAppID(network, CONTRACT_VERSION.V2),
    appArgs: MINT_APP_CALL_ARGUMENTS.v2.FLEXIBLE_MODE,
    accounts: [poolAddress],
    foreignAssets: [liquidityToken.id],
    suggestedParams: {
      ...suggestedParams,
      // Add +1 to account for the fee of the outer txn
      fee: (V2_MINT_INNER_TXN_COUNT.FLEXIBLE_MODE + 1) * ALGORAND_MIN_TX_FEE
    }
  });

  return [
    {
      txn: validatorAppCallTxn,
      signers: [initiatorAddr]
    },
    {
      txn: asset1InTxn,
      signers: [initiatorAddr]
    },
    {
      txn: asset2InTxn,
      signers: [initiatorAddr]
    }
  ];
}

export function signTxns({
  txGroup,
  initiatorSigner
}: {
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]> {
  return initiatorSigner([txGroup]);
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
export async function execute({
  client,
  pool,
  txGroup,
  signedTxns
}: {
  client: any;
  pool: PoolInfo;
  txGroup: SignerTransaction[];
  signedTxns: Uint8Array[];
}): Promise<MintExecution> {
  try {
    const liquidityOutAmount = BigInt(
      txGroup[MintTxnIndices.LIQUDITY_OUT_TXN].txn.amount
    );

    const [{confirmedRound, txnID}] = await sendAndWaitRawTransaction(client, [
      signedTxns
    ]);
    const fees = sumUpTxnFees(txGroup);
    const groupID = getTxnGroupID(txGroup);

    return {
      round: confirmedRound,
      fees,
      liquidityID: pool.liquidityTokenID!,
      liquidityOut: liquidityOutAmount,
      txnID,
      groupID
    };
  } catch (error: any) {
    const parsedError = new TinymanError(
      error,
      "We encountered something unexpected while minting liquidity. Try again later."
    );

    if (parsedError.type === "SlippageTolerance") {
      parsedError.setMessage(
        "Minting failed due to too much slippage in the price. Please adjust the slippage tolerance and try again."
      );
    }

    throw parsedError;
  }
}
