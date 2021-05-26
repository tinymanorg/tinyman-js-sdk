import algosdk from "algosdk";
import {VALIDATOR_APP_SCHEMA} from "algoswap";

import {waitForTransaction} from "./util";

const BOOTSTRAP_ENCODED = Uint8Array.from([98, 111, 111, 116, 115, 116, 114, 97, 112]); // 'bootstrap'

export async function doBootstrap({
  client,
  poolLogicSig,
  validatorAppID,
  asset1ID,
  asset2ID,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  poolLogicSig: {addr: string; program: Uint8Array};
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  initiatorAddr: string;
  initiatorSigner: (txns: any[], index: number) => Promise<Uint8Array>;
}): Promise<{liquidityTokenID: number}> {
  const suggestedParams = await client.getTransactionParams().do();

  const validatorAppCallTxn = algosdk.makeApplicationOptInTxnFromObject({
    from: poolLogicSig.addr,
    appIndex: validatorAppID,
    appArgs: [
      BOOTSTRAP_ENCODED,
      algosdk.encodeUint64(asset1ID),
      algosdk.encodeUint64(asset2ID)
    ],
    suggestedParams
  });

  const liquidityTokenCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(
    <any>{
      from: poolLogicSig.addr,
      total: Number.MAX_SAFE_INTEGER,
      decimals: 6,
      defaultFrozen: false,
      unitName: "LQDTY",
      assetName: "Liquidity",
      assetURL: "https://algoswap.com",
      suggestedParams
    }
  );

  liquidityTokenCreateTxn.assetTotal = 0xffffffffffffffffn;

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

  let txns: any[] = [
    fundingTxn,
    validatorAppCallTxn,
    liquidityTokenCreateTxn,
    asset1Optin
  ];

  if (asset2Optin) {
    txns.push(asset2Optin);
  }

  let txGroup: any[] = algosdk.assignGroupID(txns);

  const lsig = algosdk.makeLogicSig(poolLogicSig.program);
  const signedFundingTxn = await initiatorSigner(txGroup, 0);

  const txIDs: string[] = [];
  const signedTxns = txGroup.map((txn, index) => {
    if (index === 0) {
      txIDs.push(txn.txID().toString());
      return signedFundingTxn;
    }
    const {txID, blob} = algosdk.signLogicSigTransactionObject(txn, lsig);

    txIDs.push(txID);
    return blob;
  });

  try {
    await client.sendRawTransaction(signedTxns).do();
  } catch (err) {
    if (err.response) {
      throw new Error(
        `Response ${err.response.status}: ${err.response.text}\nTxIDs are: ${txIDs}`
      );
    }
    throw err;
  }

  const assetCreationResult = await waitForTransaction(client, txIDs[2]);

  const liquidityTokenID = assetCreationResult["asset-index"];

  if (typeof liquidityTokenID !== "number") {
    throw new Error(`Generated ID is not valid: got ${liquidityTokenID}`);
  }

  return {
    liquidityTokenID
  };
}
