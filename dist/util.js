"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIndexerBaseURLForNetwork = exports.getTxnGroupID = exports.sumUpTxnFees = exports.sendAndWaitRawTransaction = exports.convertToBaseUnits = exports.convertFromBaseUnits = exports.bufferToBase64 = exports.ASSET_OPT_IN_PROCESS_TXN_COUNT = exports.applySlippageToAmount = exports.waitForTransaction = exports.getMinBalanceForAccount = exports.joinUint8Arrays = exports.decodeState = void 0;
function decodeState(stateArray = []) {
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
exports.ASSET_OPT_IN_PROCESS_TXN_COUNT = 1;
function bufferToBase64(arrayBuffer) {
    return arrayBuffer ? Buffer.from(arrayBuffer).toString("base64") : "";
}
exports.bufferToBase64 = bufferToBase64;
/**
 * Computes quantity * 10^(-assetDecimals) and rounds the result
 */
function convertFromBaseUnits(assetDecimals, quantity) {
    const decimals = Number(assetDecimals);
    return roundNumber({ decimalPlaces: decimals }, 
    // eslint-disable-next-line no-magic-numbers
    Math.pow(10, -decimals) * Number(quantity));
}
exports.convertFromBaseUnits = convertFromBaseUnits;
/**
 * Computs quantity * 10^(assetDecimals) and rounds the result
 */
function convertToBaseUnits(assetDecimals, quantity) {
    // eslint-disable-next-line no-magic-numbers
    const baseAmount = Math.pow(10, Number(assetDecimals)) * Number(quantity);
    // make sure the final value is an integer. This prevents this kind of computation errors: 0.0012 * 100000 = 119.99999999999999 and rounds this result into 120
    return roundNumber({ decimalPlaces: 0 }, baseAmount);
}
exports.convertToBaseUnits = convertToBaseUnits;
/**
 * Rounds a number up to the provided decimal places limit
 * @param {Object} options -
 * @param {number} x -
 * @returns {number} Rounded number
 */
function roundNumber({ decimalPlaces = 0 }, x) {
    // eslint-disable-next-line prefer-template
    return Number(Math.round(Number(x + `e+${decimalPlaces}`)) + `e-${decimalPlaces}`);
}
/**
 * @param client - An Algodv2 client.
 * @param signedTxns - Signed txns to send
 * @param txnFees - Total transaction fees
 * @param groupID - Txn Group's ID
 * @returns Confirmed round and txnID
 */
async function sendAndWaitRawTransaction(client, signedTxnGroups) {
    let networkResponse = [];
    for (let signedTxnGroup of signedTxnGroups) {
        const { txId } = await client.sendRawTransaction(signedTxnGroup).do();
        const status = await waitForTransaction(client, txId);
        const confirmedRound = status["confirmed-round"];
        networkResponse.push({
            confirmedRound,
            txnID: txId
        });
    }
    return networkResponse;
}
exports.sendAndWaitRawTransaction = sendAndWaitRawTransaction;
function sumUpTxnFees(txns) {
    return txns.reduce((totalFee, txDetail) => totalFee + txDetail.txn.fee, 0);
}
exports.sumUpTxnFees = sumUpTxnFees;
function getTxnGroupID(txns) {
    return bufferToBase64(txns[0].txn.group);
}
exports.getTxnGroupID = getTxnGroupID;
function getIndexerBaseURLForNetwork(network) {
    let baseUrl;
    switch (network) {
        case "mainnet":
            baseUrl = "https://indexer.algoexplorerapi.io/v2/";
            break;
        case "testnet":
            baseUrl = "https://indexer.testnet.algoexplorerapi.io/v2/";
            break;
        case "hiponet":
            baseUrl = "https://algorand-hiponet.hipolabs.com/indexer/";
            break;
        default:
            throw new Error(`Network provided is not supported: ${network}`);
    }
    return baseUrl;
}
exports.getIndexerBaseURLForNetwork = getIndexerBaseURLForNetwork;
