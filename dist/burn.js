"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.burnLiquidity = exports.signBurnTxns = exports.generateBurnTxns = exports.BURN_PROCESS_TXN_COUNT = exports.getBurnLiquidityQuote = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const util_1 = require("./util");
const pool_1 = require("./pool");
const TinymanError_1 = __importDefault(require("./error/TinymanError"));
const constant_1 = require("./constant");
const assetConstants_1 = require("./asset/assetConstants");
var BurnTxnIndices;
(function (BurnTxnIndices) {
    BurnTxnIndices[BurnTxnIndices["FEE_TXN"] = 0] = "FEE_TXN";
    BurnTxnIndices[BurnTxnIndices["VALIDATOR_APP_CALL_TXN"] = 1] = "VALIDATOR_APP_CALL_TXN";
    BurnTxnIndices[BurnTxnIndices["ASSET1_OUT_TXN"] = 2] = "ASSET1_OUT_TXN";
    BurnTxnIndices[BurnTxnIndices["ASSET2_OUT_TXN"] = 3] = "ASSET2_OUT_TXN";
    BurnTxnIndices[BurnTxnIndices["LIQUDITY_IN_TXN"] = 4] = "LIQUDITY_IN_TXN";
})(BurnTxnIndices || (BurnTxnIndices = {}));
/**
 * Get a quote for how many of assets 1 and 2 a deposit of liquidityIn is worth at this moment. This
 * does not execute any transactions.
 *
 * @param params.pool Information for the pool.
 * @param params.reserves Pool reserves.
 * @param params.liquidityIn The quantity of the liquidity being deposited.
 */
function getBurnLiquidityQuote({ pool, reserves, liquidityIn }) {
    const liquidityIn_bigInt = BigInt(liquidityIn);
    const asset1Out = reserves.issuedLiquidity &&
        (liquidityIn_bigInt * reserves.asset1) / reserves.issuedLiquidity;
    const asset2Out = reserves.issuedLiquidity &&
        (liquidityIn_bigInt * reserves.asset2) / reserves.issuedLiquidity;
    return {
        round: reserves.round,
        liquidityID: pool.liquidityTokenID,
        liquidityIn: liquidityIn_bigInt,
        asset1ID: pool.asset1ID,
        asset1Out,
        asset2ID: pool.asset2ID,
        asset2Out
    };
}
exports.getBurnLiquidityQuote = getBurnLiquidityQuote;
const BURN_ENCODED = Uint8Array.from([98, 117, 114, 110]); // 'burn'
exports.BURN_PROCESS_TXN_COUNT = 5;
async function generateBurnTxns({ client, pool, liquidityIn, asset1Out, asset2Out, slippage, initiatorAddr }) {
    const suggestedParams = await client.getTransactionParams().do();
    const validatorAppCallTxn = algosdk_1.default.makeApplicationNoOpTxnFromObject({
        from: pool.addr,
        appIndex: pool.validatorAppID,
        appArgs: [BURN_ENCODED],
        accounts: [initiatorAddr],
        foreignAssets: pool.asset2ID == assetConstants_1.ALGO_ASSET_ID
            ? [pool.asset1ID, pool.liquidityTokenID]
            : [pool.asset1ID, pool.asset2ID, pool.liquidityTokenID],
        suggestedParams
    });
    const asset1OutAmount = util_1.applySlippageToAmount("negative", slippage, asset1Out);
    const asset1OutTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: pool.addr,
        to: initiatorAddr,
        assetIndex: pool.asset1ID,
        amount: asset1OutAmount,
        suggestedParams
    });
    const asset2OutAmount = util_1.applySlippageToAmount("negative", slippage, asset2Out);
    let asset2OutTxn;
    if (pool.asset2ID === assetConstants_1.ALGO_ASSET_ID) {
        asset2OutTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            amount: asset2OutAmount,
            suggestedParams
        });
    }
    else {
        asset2OutTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            assetIndex: pool.asset2ID,
            amount: asset2OutAmount,
            suggestedParams
        });
    }
    const liquidityInTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        assetIndex: pool.liquidityTokenID,
        amount: liquidityIn,
        suggestedParams
    });
    let txnFees = validatorAppCallTxn.fee + asset1OutTxn.fee + asset2OutTxn.fee;
    const feeTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        amount: txnFees,
        note: constant_1.DEFAULT_FEE_TXN_NOTE,
        suggestedParams
    });
    txnFees += liquidityInTxn.fee + feeTxn.fee;
    const txGroup = algosdk_1.default.assignGroupID([
        feeTxn,
        validatorAppCallTxn,
        asset1OutTxn,
        asset2OutTxn,
        liquidityInTxn
    ]);
    return [
        { txn: txGroup[BurnTxnIndices.FEE_TXN], signers: [initiatorAddr] },
        { txn: txGroup[BurnTxnIndices.VALIDATOR_APP_CALL_TXN], signers: [pool.addr] },
        { txn: txGroup[BurnTxnIndices.ASSET1_OUT_TXN], signers: [pool.addr] },
        { txn: txGroup[BurnTxnIndices.ASSET2_OUT_TXN], signers: [pool.addr] },
        { txn: txGroup[BurnTxnIndices.LIQUDITY_IN_TXN], signers: [initiatorAddr] }
    ];
}
exports.generateBurnTxns = generateBurnTxns;
async function signBurnTxns({ pool, txGroup, initiatorSigner }) {
    const [signedFeeTxn, signedLiquidityInTxn] = await initiatorSigner([txGroup]);
    const lsig = algosdk_1.default.makeLogicSig(pool.program);
    const signedTxns = txGroup.map((txDetail, index) => {
        if (index === BurnTxnIndices.FEE_TXN) {
            return signedFeeTxn;
        }
        if (index === BurnTxnIndices.LIQUDITY_IN_TXN) {
            return signedLiquidityInTxn;
        }
        const { blob } = algosdk_1.default.signLogicSigTransactionObject(txDetail.txn, lsig);
        return blob;
    });
    return signedTxns;
}
exports.signBurnTxns = signBurnTxns;
/**
 * Execute a burn operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.liquidityIn The quantity of liquidity tokens being deposited.
 * @param params.asset1Out.amount The quantity of the first asset being withdrawn.
 * @param params.asset1Out.slippage The maximum acceptable slippage rate for asset1. Should be an
 *   integer between 0 and 100 and acts as a percentage of params.asset1Out.amount.
 * @param params.asset2Out.amount The quantity of the second asset being withdrawn.
 * @param params.asset2Out.slippage The maximum acceptable slippage rate for asset2. Should be an
 *   integer between 0 and 100 and acts as a percentage of params.asset2Out.amount.
 * @param params.initiatorAddr The address of the account performing the burn operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function burnLiquidity({ client, pool, txGroup, signedTxns, initiatorAddr }) {
    try {
        const asset1Out = txGroup[BurnTxnIndices.ASSET1_OUT_TXN].txn.amount;
        const asset2Out = txGroup[BurnTxnIndices.ASSET2_OUT_TXN].txn.amount;
        const liquidityIn = txGroup[BurnTxnIndices.LIQUDITY_IN_TXN].txn.amount;
        const prevExcessAssets = await pool_1.getAccountExcess({
            client,
            pool,
            accountAddr: initiatorAddr
        });
        const [{ confirmedRound, txnID }] = await util_1.sendAndWaitRawTransaction(client, [
            signedTxns
        ]);
        const excessAssets = await pool_1.getAccountExcess({
            client,
            pool,
            accountAddr: initiatorAddr
        });
        let excessAmountDeltaAsset1 = excessAssets.excessAsset1 - prevExcessAssets.excessAsset1;
        if (excessAmountDeltaAsset1 < 0n) {
            excessAmountDeltaAsset1 = 0n;
        }
        let excessAmountDeltaAsset2 = excessAssets.excessAsset2 - prevExcessAssets.excessAsset2;
        if (excessAmountDeltaAsset2 < 0n) {
            excessAmountDeltaAsset2 = 0n;
        }
        return {
            round: confirmedRound,
            fees: util_1.sumUpTxnFees(txGroup),
            asset1ID: pool.asset1ID,
            asset1Out: BigInt(asset1Out) + excessAmountDeltaAsset1,
            asset2ID: pool.asset2ID,
            asset2Out: BigInt(asset2Out) + excessAmountDeltaAsset2,
            liquidityID: pool.liquidityTokenID,
            liquidityIn: BigInt(liquidityIn),
            excessAmounts: [
                {
                    assetID: pool.asset1ID,
                    excessAmountForBurning: excessAmountDeltaAsset1,
                    totalExcessAmount: excessAssets.excessAsset1
                },
                {
                    assetID: pool.asset2ID,
                    excessAmountForBurning: excessAmountDeltaAsset2,
                    totalExcessAmount: excessAssets.excessAsset2
                }
            ],
            txnID,
            groupID: util_1.getTxnGroupID(txGroup)
        };
    }
    catch (error) {
        const parsedError = new TinymanError_1.default(error, "We encountered something unexpected while burning liquidity. Try again later.");
        if (parsedError.type === "SlippageTolerance") {
            parsedError.setMessage("The burn failed due to too much slippage in the price. Please adjust the slippage tolerance and try again.");
        }
        throw parsedError;
    }
}
exports.burnLiquidity = burnLiquidity;
