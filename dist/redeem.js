"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExcessAmountsWithPoolAssetDetails = exports.getExcessAmounts = exports.generateRedeemTxns = exports.REDEEM_PROCESS_TXN_COUNT = exports.redeemAllExcessAsset = exports.redeemExcessAsset = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const base64_js_1 = require("base64-js");
const util_1 = require("./util");
const pool_1 = require("./pool");
const constant_1 = require("./constant");
const TinymanError_1 = __importDefault(require("./error/TinymanError"));
const assetUtils_1 = require("./asset/assetUtils");
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
    try {
        const signedTxns = await signRedeemTxns({
            txGroup,
            pool,
            initiatorSigner
        });
        const [{ txnID, confirmedRound }] = await util_1.sendAndWaitRawTransaction(client, [
            signedTxns
        ]);
        return {
            fees: util_1.sumUpTxnFees(txGroup),
            confirmedRound,
            txnID,
            groupID: util_1.getTxnGroupID(txGroup)
        };
    }
    catch (error) {
        throw new TinymanError_1.default(error, "We encountered something unexpected while redeeming. Try again later.");
    }
}
exports.redeemExcessAsset = redeemExcessAsset;
async function signRedeemTxns({ txGroup, pool, initiatorSigner }) {
    const [signedFeeTxn] = await initiatorSigner([txGroup]);
    const lsig = algosdk_1.default.makeLogicSig(pool.program);
    const signedTxns = txGroup.map((txDetail, index) => {
        if (index === 0) {
            return signedFeeTxn;
        }
        const { blob } = algosdk_1.default.signLogicSigTransactionObject(txDetail.txn, lsig);
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
    try {
        const redeemGroups = data.map(({ txGroup, pool }) => {
            return {
                txns: txGroup,
                txnFees: util_1.sumUpTxnFees(txGroup),
                groupID: util_1.getTxnGroupID(txGroup),
                lsig: algosdk_1.default.makeLogicSig(pool.program)
            };
        });
        const signedFeeTxns = await initiatorSigner(redeemGroups.map((item) => item.txns));
        const redeemTxnsPromise = Promise.all(redeemGroups.map((redeemGroup, groupIndex) => new Promise(async (resolve, reject) => {
            try {
                const signedTxns = redeemGroup.txns.map((txDetail, txnIndex) => {
                    if (txnIndex === 0) {
                        // Get the txn signed by initiator
                        return signedFeeTxns[groupIndex];
                    }
                    const { blob } = algosdk_1.default.signLogicSigTransactionObject(txDetail.txn, redeemGroup.lsig);
                    return blob;
                });
                const [{ txnID, confirmedRound }] = await util_1.sendAndWaitRawTransaction(client, [
                    signedTxns
                ]);
                resolve({
                    fees: redeemGroup.txnFees,
                    groupID: redeemGroup.groupID,
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
    catch (error) {
        throw new TinymanError_1.default(error, "We encountered something unexpected while redeeming. Try again later.");
    }
}
exports.redeemAllExcessAsset = redeemAllExcessAsset;
exports.REDEEM_PROCESS_TXN_COUNT = 3;
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
    const txGroup = algosdk_1.default.assignGroupID([feeTxn, validatorAppCallTxn, assetOutTxn]);
    return [
        {
            txn: txGroup[0],
            signers: [initiatorAddr]
        },
        {
            txn: txGroup[1],
            signers: [pool.addr]
        },
        {
            txn: txGroup[2],
            signers: [pool.addr]
        }
    ];
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
async function getExcessAmountsWithPoolAssetDetails({ client, network, accountAddr, validatorAppID }) {
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
                assetUtils_1.getAssetInformationById(network, poolAssets.asset1ID),
                assetUtils_1.getAssetInformationById(network, poolAssets.asset2ID),
                assetUtils_1.getAssetInformationById(network, poolInfo.liquidityTokenID)
            ]);
            let excessAsset = assetDetails[0].asset;
            if (assetID === Number(assetDetails[1].asset.id)) {
                excessAsset = assetDetails[1].asset;
            }
            else if (assetID === Number(assetDetails[2]?.asset.id)) {
                excessAsset = assetDetails[2].asset;
            }
            excessDataWithDetail.push({
                amount,
                asset: excessAsset,
                pool: {
                    info: poolInfo,
                    asset1: assetDetails[0].asset,
                    asset2: assetDetails[1].asset,
                    liquidityAsset: assetDetails[2].asset
                }
            });
        }
    }
    return excessDataWithDetail;
}
exports.getExcessAmountsWithPoolAssetDetails = getExcessAmountsWithPoolAssetDetails;
