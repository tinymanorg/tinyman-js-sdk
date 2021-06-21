"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferToBase64 = exports.optIntoAsset = exports.applySlippageToAmount = exports.waitForTransaction = exports.getMinBalanceForAccount = exports.joinUint8Arrays = exports.decodeState = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
function decodeState(stateArray) {
    const state = {};
    for (const pair of stateArray) {
        const { key } = pair;
        let value;
        // intentionally using == to match BigInts
        // eslint-disable-next-line eqeqeq
        if (pair.value.type == 1) {
            // value is byte array
            value = pair.value.bytes;
            // eslint-disable-next-line eqeqeq
        }
        else if (pair.value.type == 2) {
            // value is uint64
            value = pair.value.uint;
        }
        else {
            throw new Error(`Unexpected state type: ${pair.value.type}`);
        }
        state[key] = value;
    }
    return state;
}
exports.decodeState = decodeState;
function joinUint8Arrays(arrays) {
    const joined = [];
    for (const array of arrays) {
        joined.push(...array);
    }
    return Uint8Array.from(joined);
}
exports.joinUint8Arrays = joinUint8Arrays;
const MIN_BALANCE_PER_ACCOUNT = 100000n;
const MIN_BALANCE_PER_ASSET = 100000n;
const MIN_BALANCE_PER_APP = 100000n;
const MIN_BALANCE_PER_APP_BYTESLICE = 25000n + 25000n;
const MIN_BALANCE_PER_APP_UINT = 25000n + 3500n;
function getMinBalanceForAccount(accountInfo) {
    const totalSchema = accountInfo["apps-total-schema"];
    let totalByteSlices = 0n;
    let totalUints = 0n;
    if (totalSchema) {
        if (totalSchema["num-byte-slice"]) {
            totalByteSlices = totalSchema["num-byte-slice"];
        }
        if (totalSchema["num-uint"]) {
            totalUints = totalSchema["num-uint"];
        }
    }
    const localApps = accountInfo["apps-local-state"] || [];
    const createdApps = accountInfo["created-apps"] || [];
    const assets = accountInfo.assets || [];
    return (MIN_BALANCE_PER_ACCOUNT +
        MIN_BALANCE_PER_ASSET * BigInt(assets.length) +
        MIN_BALANCE_PER_APP * BigInt(createdApps.length + localApps.length) +
        MIN_BALANCE_PER_APP_UINT * totalUints +
        MIN_BALANCE_PER_APP_BYTESLICE * totalByteSlices);
}
exports.getMinBalanceForAccount = getMinBalanceForAccount;
async function waitForTransaction(client, txId) {
    let lastStatus = await client.status().do();
    let lastRound = lastStatus["last-round"];
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const status = await client.pendingTransactionInformation(txId).do();
        if (status["pool-error"]) {
            throw new Error(`Transaction Pool Error: ${status["pool-error"]}`);
        }
        if (status["confirmed-round"]) {
            return status;
        }
        lastStatus = await client.statusAfterBlock(lastRound + 1).do();
        lastRound = lastStatus["last-round"];
    }
}
exports.waitForTransaction = waitForTransaction;
function applySlippageToAmount(type, slippage, amount) {
    if (slippage > 1 || slippage < 0) {
        throw new Error(`Invalid slippage value. Must be between 0 and 1, got ${slippage}`);
    }
    let final;
    try {
        const offset = type === "negative" ? 1 - slippage : 1 + slippage;
        final = BigInt(Math.floor(Number(amount) * offset));
    }
    catch (error) {
        throw new Error(error.message);
    }
    return final;
}
exports.applySlippageToAmount = applySlippageToAmount;
async function optIntoAsset({ client, assetID, initiatorAddr, initiatorSigner }) {
    const suggestedParams = await client.getTransactionParams().do();
    const optInTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: initiatorAddr,
        assetIndex: assetID,
        amount: 0,
        suggestedParams
    });
    const [signedTxn] = await initiatorSigner([optInTxn]);
    const { txId } = await client.sendRawTransaction(signedTxn).do();
    await waitForTransaction(client, txId);
}
exports.optIntoAsset = optIntoAsset;
function bufferToBase64(arrayBuffer) {
    return arrayBuffer ? Buffer.from(arrayBuffer).toString("base64") : "";
}
exports.bufferToBase64 = bufferToBase64;
