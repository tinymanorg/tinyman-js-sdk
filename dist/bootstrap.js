"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doBootstrap = exports.signBootstrapTransactions = exports.generateBootstrapTransactions = exports.getBootstrapProcessTxnCount = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const contracts_1 = require("./contracts");
const util_1 = require("./util");
const constant_1 = require("./constant");
const BOOTSTRAP_ENCODED = Uint8Array.from([98, 111, 111, 116, 115, 116, 114, 97, 112]); // 'bootstrap'
var BootstapTxnGroupIndices;
(function (BootstapTxnGroupIndices) {
    BootstapTxnGroupIndices[BootstapTxnGroupIndices["FUNDING_TXN"] = 0] = "FUNDING_TXN";
    BootstapTxnGroupIndices[BootstapTxnGroupIndices["VALIDATOR_APP_CALL"] = 1] = "VALIDATOR_APP_CALL";
    BootstapTxnGroupIndices[BootstapTxnGroupIndices["LIQUIDITY_TOKEN_CREATE"] = 2] = "LIQUIDITY_TOKEN_CREATE";
    BootstapTxnGroupIndices[BootstapTxnGroupIndices["ASSET1_OPT_IN"] = 3] = "ASSET1_OPT_IN";
    BootstapTxnGroupIndices[BootstapTxnGroupIndices["ASSET2_OPT_IN"] = 4] = "ASSET2_OPT_IN";
})(BootstapTxnGroupIndices || (BootstapTxnGroupIndices = {}));
function getBootstrapProcessTxnCount(asset2ID) {
    // IF asset2 is ALGO, there won't be `asset2Optin` txn within the bootstrap txn group
    return constant_1.ALGO_ASSET_ID === asset2ID ? 4 : 5;
}
exports.getBootstrapProcessTxnCount = getBootstrapProcessTxnCount;
async function generateBootstrapTransactions({ client, poolLogicSig, validatorAppID, asset1ID, asset2ID, asset1UnitName, asset2UnitName, initiatorAddr }) {
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
        unitName: constant_1.LIQUIDITY_TOKEN_UNIT_NAME,
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
    return algosdk_1.default.assignGroupID(txns);
}
exports.generateBootstrapTransactions = generateBootstrapTransactions;
async function signBootstrapTransactions({ poolLogicSig, txGroup, initiatorSigner }) {
    const [signedFundingTxn] = await initiatorSigner([
        txGroup[BootstapTxnGroupIndices.FUNDING_TXN]
    ]);
    const lsig = algosdk_1.default.makeLogicSig(poolLogicSig.program);
    const txnIDs = [];
    const signedTxns = txGroup.map((txn, index) => {
        if (index === BootstapTxnGroupIndices.FUNDING_TXN) {
            txnIDs.push(txn.txID().toString());
            return signedFundingTxn;
        }
        const { txID, blob } = algosdk_1.default.signLogicSigTransactionObject(txn, lsig);
        txnIDs.push(txID);
        return blob;
    });
    return { signedTxns, txnIDs };
}
exports.signBootstrapTransactions = signBootstrapTransactions;
async function doBootstrap({ client, signedTxns, txnIDs }) {
    try {
        await client.sendRawTransaction(signedTxns).do();
    }
    catch (err) {
        if (err.response) {
            throw new Error(`Response ${err.response.status}: ${err.response.text}\nTxIDs are: ${txnIDs}`);
        }
        throw err;
    }
    const assetCreationResult = await util_1.waitForTransaction(client, txnIDs[BootstapTxnGroupIndices.LIQUIDITY_TOKEN_CREATE]);
    const liquidityTokenID = assetCreationResult["asset-index"];
    if (typeof liquidityTokenID !== "number") {
        throw new Error(`Generated ID is not valid: got ${liquidityTokenID}`);
    }
    return {
        liquidityTokenID
    };
}
exports.doBootstrap = doBootstrap;
