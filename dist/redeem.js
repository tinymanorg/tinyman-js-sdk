"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExcessAmountsWithPoolAssetDetails = exports.getExcessAmounts = exports.generateRedeemTxns = exports.redeemAllExcessAsset = exports.redeemExcessAsset = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const base64_js_1 = require("base64-js");
const util_1 = require("./util");
const pool_1 = require("./pool");
const constant_1 = require("./constant");
const REDEEM_ENCODED = Uint8Array.from([114, 101, 100, 101, 101, 109]); // 'redeem'
/**
 * Execute a redeem operation to collect excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or liquidityTokenID.
 * @param params.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function redeemExcessAsset({ client, pool, txGroup, initiatorSigner }) {
    const signedTxns = await signRedeemTxns({
        txGroup,
        pool,
        initiatorSigner
    });
    const { txnID, confirmedRound } = await util_1.sendAndWaitRawTransaction(client, signedTxns);
    return {
        fees: util_1.sumUpTxnFees(txGroup),
        confirmedRound,
        txnID,
        groupID: util_1.bufferToBase64(txGroup[0].group)
    };
}
exports.redeemExcessAsset = redeemExcessAsset;
async function signRedeemTxns({ txGroup, pool, initiatorSigner }) {
    const [signedFeeTxn] = await initiatorSigner([txGroup[0]]);
    const lsig = algosdk_1.default.makeLogicSig(pool.program);
    const signedTxns = txGroup.map((txn, index) => {
        if (index === 0) {
            return signedFeeTxn;
        }
        const { blob } = algosdk_1.default.signLogicSigTransactionObject(txn, lsig);
        return blob;
    });
    return signedTxns;
}
/**
 * Execute redeem operations to collect all excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.data.pool Information for the pool.
 * @param params.data.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or liquidityTokenID.
 * @param params.data.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function redeemAllExcessAsset({ client, data, initiatorSigner }) {
    const redeemItems = data.map(({ txGroup, pool }) => ({
        txGroup,
        txnFees: util_1.sumUpTxnFees(txGroup),
        groupID: util_1.getTxnGroupID(txGroup),
        lsig: algosdk_1.default.makeLogicSig(pool.program)
    }));
    // These are signed by the initiator
    const transactionsToSign = redeemItems.map((item) => {
        return item.txGroup[0]; // feeTxn;
    });
    const signedFeeTxns = await initiatorSigner(transactionsToSign);
    const redeemTxnsPromise = Promise.all(redeemItems.map((item, index) => new Promise(async (resolve, reject) => {
        try {
            const signedTxns = item.txGroup.map((txn, txnIndex) => {
                if (txnIndex === 0) {
                    // Get the txn signed by initiator
                    return signedFeeTxns[index];
                }
                const { blob } = algosdk_1.default.signLogicSigTransactionObject(txn, item.lsig);
                return blob;
            });
            const { txnID, confirmedRound } = await util_1.sendAndWaitRawTransaction(client, signedTxns);
            resolve({
                fees: item.txnFees,
                groupID: item.groupID,
                txnID,
                confirmedRound
            });
        }
        catch (error) {
            reject(error);
        }
    })));
    return redeemTxnsPromise;
}
exports.redeemAllExcessAsset = redeemAllExcessAsset;
async function generateRedeemTxns({ client, pool, assetID, assetOut, initiatorAddr }) {
    const suggestedParams = await client.getTransactionParams().do();
    const validatorAppCallTxn = algosdk_1.default.makeApplicationNoOpTxnFromObject({
        from: pool.addr,
        appIndex: pool.validatorAppID,
        appArgs: [REDEEM_ENCODED],
        accounts: [initiatorAddr],
        foreignAssets: 
        // eslint-disable-next-line eqeqeq
        pool.asset2ID == 0
            ? [pool.asset1ID, pool.liquidityTokenID]
            : [pool.asset1ID, pool.asset2ID, pool.liquidityTokenID],
        suggestedParams
    });
    let assetOutTxn;
    if (assetID === 0) {
        assetOutTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            amount: assetOut,
            suggestedParams
        });
    }
    else {
        assetOutTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            assetIndex: assetID,
            amount: assetOut,
            suggestedParams
        });
    }
    const feeTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        amount: validatorAppCallTxn.fee + assetOutTxn.fee,
        note: constant_1.DEFAULT_FEE_TXN_NOTE,
        suggestedParams
    });
    const txGroup = algosdk_1.default.assignGroupID([
        feeTxn,
        validatorAppCallTxn,
        assetOutTxn
    ]);
    return txGroup;
}
exports.generateRedeemTxns = generateRedeemTxns;
/**
 * Generates a list of excess amounts accumulated within an account.
 * @param params.client An Algodv2 client.
 * @param params.accountAddr The address of the account performing the redeem operation.
 * @param params.validatorAppID Validator APP ID
 * @returns List of excess amounts
 */
async function getExcessAmounts({ client, accountAddr, validatorAppID }) {
    const info = (await client
        .accountInformation(accountAddr)
        .setIntDecoding("bigint")
        .do());
    const appsLocalState = info["apps-local-state"] || [];
    const appState = appsLocalState.find(
    // `==` is used here to coerce bigints if necessary
    // eslint-disable-next-line eqeqeq
    (appLocalState) => appLocalState.id == validatorAppID);
    let excessData = [];
    if (appState && appState["key-value"]) {
        const state = util_1.decodeState(appState["key-value"]);
        for (let entry of Object.entries(state)) {
            const [key, value] = entry;
            const decodedKey = base64_js_1.toByteArray(key);
            if (decodedKey.length === 41 && decodedKey[32] === 101) {
                excessData.push({
                    poolAddress: algosdk_1.default.encodeAddress(decodedKey.slice(0, 32)),
                    assetID: algosdk_1.default.decodeUint64(decodedKey.slice(33, 41), "safe"),
                    amount: parseInt(value)
                });
            }
        }
    }
    return excessData;
}
exports.getExcessAmounts = getExcessAmounts;
/**
 * Generates a list of excess amounts accumulated within an account. Each item includes details of pool and its assets.
 * @param params.client An Algodv2 client.
 * @param params.accountAddr The address of the account performing the redeem operation.
 * @param params.validatorAppID Validator APP ID
 * @returns List of excess amounts
 */
async function getExcessAmountsWithPoolAssetDetails({ client, accountAddr, validatorAppID }) {
    const excessData = await getExcessAmounts({ client, accountAddr, validatorAppID });
    let excessDataWithDetail = [];
    for (let data of excessData) {
        const { poolAddress, assetID, amount } = data;
        const poolAssets = await pool_1.getPoolAssets({
            client,
            address: poolAddress,
            validatorAppID
        });
        if (poolAssets) {
            const poolInfo = await pool_1.getPoolInfo(client, {
                validatorAppID,
                asset1ID: poolAssets.asset1ID,
                asset2ID: poolAssets.asset2ID
            });
            const assetDetails = await Promise.all([
                util_1.getAssetInformationById(client, poolAssets.asset1ID),
                util_1.getAssetInformationById(client, poolAssets.asset2ID),
                util_1.getAssetInformationById(client, poolInfo.liquidityTokenID)
            ]);
            let excessAsset = assetDetails[0];
            if (assetID === Number(assetDetails[1].id)) {
                excessAsset = assetDetails[1];
            }
            else if (assetID === Number(assetDetails[2]?.id)) {
                excessAsset = assetDetails[2];
            }
            excessDataWithDetail.push({
                amount,
                asset: excessAsset,
                pool: {
                    info: poolInfo,
                    asset1: assetDetails[0],
                    asset2: assetDetails[1],
                    liquidityAsset: assetDetails[2]
                }
            });
        }
    }
    return excessDataWithDetail;
}
exports.getExcessAmountsWithPoolAssetDetails = getExcessAmountsWithPoolAssetDetails;
