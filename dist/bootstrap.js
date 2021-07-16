"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doBootstrap = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const contracts_1 = require("./contracts");
const util_1 = require("./util");
const BOOTSTRAP_ENCODED = Uint8Array.from([98, 111, 111, 116, 115, 116, 114, 97, 112]); // 'bootstrap'
async function doBootstrap({ client, poolLogicSig, validatorAppID, asset1ID, asset2ID, asset1UnitName, asset2UnitName, initiatorAddr, initiatorSigner }) {
    const suggestedParams = await client.getTransactionParams().do();
    const validatorAppCallTxn = algosdk_1.default.makeApplicationOptInTxnFromObject({
        from: poolLogicSig.addr,
        appIndex: validatorAppID,
        appArgs: [
            BOOTSTRAP_ENCODED,
            algosdk_1.default.encodeUint64(asset1ID),
            algosdk_1.default.encodeUint64(asset2ID)
        ],
        foreignAssets: asset2ID == 0 ? [asset1ID] : [asset1ID, asset2ID],
        suggestedParams
    });
    const liquidityTokenCreateTxn = algosdk_1.default.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: poolLogicSig.addr,
        total: 0xffffffffffffffffn,
        decimals: 6,
        defaultFrozen: false,
        unitName: "TM1Pool",
        assetName: `Tinyman Pool ${asset1UnitName}-${asset2UnitName}`,
        assetURL: "https://tinyman.org",
        suggestedParams
    });
    const asset1Optin = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: poolLogicSig.addr,
        to: poolLogicSig.addr,
        assetIndex: asset1ID,
        amount: 0,
        suggestedParams
    });
    const asset2Optin = asset2ID === 0
        ? null
        : algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: poolLogicSig.addr,
            to: poolLogicSig.addr,
            assetIndex: asset2ID,
            amount: 0,
            suggestedParams
        });
    const minBalance = 100000 + // min account balance
        100000 + // min balance to create asset
        100000 + // fee + min balance to opt into asset 1
        (asset2Optin ? 100000 : 0) + // min balance to opt into asset 2
        100000 +
        (25000 + 3500) * contracts_1.VALIDATOR_APP_SCHEMA.numLocalInts +
        (25000 + 25000) * contracts_1.VALIDATOR_APP_SCHEMA.numLocalByteSlices; // min balance to opt into validator app
    const fundingAmount = minBalance +
        liquidityTokenCreateTxn.fee +
        asset1Optin.fee +
        (asset2Optin ? asset2Optin.fee : 0) +
        validatorAppCallTxn.fee;
    const fundingTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: poolLogicSig.addr,
        amount: fundingAmount,
        suggestedParams
    });
    let txns = [
        fundingTxn,
        validatorAppCallTxn,
        liquidityTokenCreateTxn,
        asset1Optin
    ];
    if (asset2Optin) {
        txns.push(asset2Optin);
    }
    let txGroup = algosdk_1.default.assignGroupID(txns);
    const lsig = algosdk_1.default.makeLogicSig(poolLogicSig.program);
    const [signedFundingTxn] = await initiatorSigner([txGroup[0]]);
    const txIDs = [];
    const signedTxns = txGroup.map((txn, index) => {
        if (index === 0) {
            txIDs.push(txn.txID().toString());
            return signedFundingTxn;
        }
        const { txID, blob } = algosdk_1.default.signLogicSigTransactionObject(txn, lsig);
        txIDs.push(txID);
        return blob;
    });
    try {
        await client.sendRawTransaction(signedTxns).do();
    }
    catch (err) {
        if (err.response) {
            throw new Error(`Response ${err.response.status}: ${err.response.text}\nTxIDs are: ${txIDs}`);
        }
        throw err;
    }
    const assetCreationResult = await util_1.waitForTransaction(client, txIDs[2]);
    const liquidityTokenID = assetCreationResult["asset-index"];
    if (typeof liquidityTokenID !== "number") {
        throw new Error(`Generated ID is not valid: got ${liquidityTokenID}`);
    }
    return {
        liquidityTokenID
    };
}
exports.doBootstrap = doBootstrap;
