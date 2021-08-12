import algosdk, {Algodv2, Transaction} from "algosdk";

import {VALIDATOR_APP_SCHEMA} from "./contracts";
import {InitiatorSigner} from "./common-types";
import {waitForTransaction} from "./util";
import {LIQUIDITY_TOKEN_UNIT_NAME} from "./constant";

const BOOTSTRAP_ENCODED = Uint8Array.from([98, 111, 111, 116, 115, 116, 114, 97, 112]); // 'bootstrap'

enum BootstapTxnGroupIndices {
  FUNDING_TXN = 0,
  VALIDATOR_APP_CALL,
  LIQUIDITY_TOKEN_CREATE,
  ASSET1_OPT_IN,
  ASSET2_OPT_IN
}

export async function generateBootstrapTransactions({
  client,
  poolLogicSig,
  validatorAppID,
  asset1ID,
  asset2ID,
  asset1UnitName,
  asset2UnitName,
  initiatorAddr
}: {
  client: Algodv2;
  poolLogicSig: {addr: string; program: Uint8Array};
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  asset1UnitName: string;
  asset2UnitName: string;
  initiatorAddr: string;
}): Promise<Transaction[]> {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallTxn = algosdk.makeApplicationOptInTxnFromObject({
    from: poolLogicSig.addr,
    appIndex: validatorAppID,
    appArgs: [
      BOOTSTRAP_ENCODED,
      algosdk.encodeUint64(asset1ID),
      algosdk.encodeUint64(asset2ID)
    ],
    foreignAssets: asset2ID == 0 ? [asset1ID] : [asset1ID, asset2ID],
    suggestedParams
  });

  const liquidityTokenCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(
    {
      from: poolLogicSig.addr,
      total: 0xffffffffffffffffn,
      decimals: 6,
      defaultFrozen: false,
      unitName: LIQUIDITY_TOKEN_UNIT_NAME,
      assetName: `Tinyman Pool ${asset1UnitName}-${asset2UnitName}`,
      assetURL: "https://tinyman.org",
      suggestedParams
    }
  );

  const asset1Optin = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: poolLogicSig.addr,
    to: poolLogicSig.addr,
    assetIndex: asset1ID,
    amount: 0,
    suggestedParams
  });

  const asset2Optin =
    asset2ID === 0
      ? null
      : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: poolLogicSig.addr,
          to: poolLogicSig.addr,
          assetIndex: asset2ID,
          amount: 0,
          suggestedParams
        });

  const minBalance =
    100000 + // min account balance
    100000 + // min balance to create asset
    100000 + // fee + min balance to opt into asset 1
    (asset2Optin ? 100000 : 0) + // min balance to opt into asset 2
    100000 +
    (25000 + 3500) * VALIDATOR_APP_SCHEMA.numLocalInts +
    (25000 + 25000) * VALIDATOR_APP_SCHEMA.numLocalByteSlices; // min balance to opt into validator app

  const fundingAmount =
    minBalance +
    liquidityTokenCreateTxn.fee +
    asset1Optin.fee +
    (asset2Optin ? asset2Optin.fee : 0) +
    validatorAppCallTxn.fee;

  const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: initiatorAddr,
    to: poolLogicSig.addr,
    amount: fundingAmount,
    suggestedParams
  });

  let txns: Transaction[] = [
    fundingTxn,
    validatorAppCallTxn,
    liquidityTokenCreateTxn,
    asset1Optin
  ];

  if (asset2Optin) {
    txns.push(asset2Optin);
  }

  return algosdk.assignGroupID(txns);
}

export async function signBootstrapTransactions({
  poolLogicSig,
  txGroup,
  initiatorSigner
}: {
  poolLogicSig: {addr: string; program: Uint8Array};
  txGroup: Transaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<{signedTxns: Uint8Array[]; txnIDs: string[]}> {
  const [signedFundingTxn] = await initiatorSigner([
    txGroup[BootstapTxnGroupIndices.FUNDING_TXN]
  ]);
  const lsig = algosdk.makeLogicSig(poolLogicSig.program);

  const txnIDs: string[] = [];
  const signedTxns = txGroup.map((txn, index) => {
    if (index === BootstapTxnGroupIndices.FUNDING_TXN) {
      txnIDs.push(txn.txID().toString());
      return signedFundingTxn;
    }
    const {txID, blob} = algosdk.signLogicSigTransactionObject(txn, lsig);

    txnIDs.push(txID);
    return blob;
  });

  return {signedTxns, txnIDs};
}

export async function doBootstrap({
  client,
  signedTxns,
  txnIDs
}: {
  client: any;
  signedTxns: Uint8Array[];
  txnIDs: string[];
}): Promise<{liquidityTokenID: number}> {
  try {
    await client.sendRawTransaction(signedTxns).do();
  } catch (err) {
    if (err.response) {
      throw new Error(
        `Response ${err.response.status}: ${err.response.text}\nTxIDs are: ${txnIDs}`
      );
    }
    throw err;
  }

  const assetCreationResult = await waitForTransaction(
    client,
    txnIDs[BootstapTxnGroupIndices.LIQUIDITY_TOKEN_CREATE]
  );

  const liquidityTokenID = assetCreationResult["asset-index"];

  if (typeof liquidityTokenID !== "number") {
    throw new Error(`Generated ID is not valid: got ${liquidityTokenID}`);
  }

  return {
    liquidityTokenID
  };
}
