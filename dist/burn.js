"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.burnLiquidity = exports.getBurnLiquidityQuote = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const util_1 = require("./util");
const pool_1 = require("./pool");
const redeem_1 = require("./redeem");
/**
 * Get a quote for how many of assets 1 and 2 a deposit of liquidityIn is worth at this moment. This
 * does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.liquidityIn The quantity of the liquidity being deposited.
 */
async function getBurnLiquidityQuote({ client, pool, liquidityIn }) {
    const reserves = await pool_1.getPoolReserves(client, pool);
    const liquidityIn_bigInt = BigInt(liquidityIn);
    const asset1Out = (liquidityIn_bigInt * reserves.asset1) / reserves.issuedLiquidity;
    const asset2Out = (liquidityIn_bigInt * reserves.asset2) / reserves.issuedLiquidity;
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
async function doBurn({ client, pool, liquidityIn, asset1Out, asset2Out, initiatorAddr, initiatorSigner }) {
    const suggestedParams = await client.getTransactionParams().do();
    const validatorAppCallTxn = algosdk_1.default.makeApplicationNoOpTxnFromObject({
        from: pool.addr,
        appIndex: pool.validatorAppID,
        appArgs: [BURN_ENCODED],
        accounts: [initiatorAddr],
        foreignAssets: pool.asset2ID == 0 ? [pool.asset1ID, pool.liquidityTokenID] : [pool.asset1ID, pool.asset2ID, pool.liquidityTokenID],
        suggestedParams
    });
    const asset1OutTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: pool.addr,
        to: initiatorAddr,
        assetIndex: pool.asset1ID,
        amount: asset1Out,
        suggestedParams
    });
    let asset2OutTxn;
    if (pool.asset2ID === 0) {
        asset2OutTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            amount: asset2Out,
            suggestedParams
        });
    }
    else {
        asset2OutTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            assetIndex: pool.asset2ID,
            amount: asset1Out,
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
    const lsig = algosdk_1.default.makeLogicSig(pool.program);
    const [signedFeeTxn, signedLiquidityInTxn] = await initiatorSigner([
        txGroup[0],
        txGroup[4]
    ]);
    const signedTxns = txGroup.map((txn, index) => {
        if (index === 0) {
            return signedFeeTxn;
        }
        if (index === 4) {
            return signedLiquidityInTxn;
        }
        const { blob } = algosdk_1.default.signLogicSigTransactionObject(txn, lsig);
        return blob;
    });
    const { txId } = await client.sendRawTransaction(signedTxns).do();
    const status = await util_1.waitForTransaction(client, txId);
    const confirmedRound = status["confirmed-round"];
    return {
        fees: txnFees,
        confirmedRound
    };
}
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
 * @param params.redeemExcess If true, any excess amount of the output assets created by this burn
 *   will be redeemed after the burn executes.
 * @param params.initiatorAddr The address of the account performing the burn operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function burnLiquidity({ client, pool, liquidityIn, asset1Out, asset2Out, slippage, redeemExcess = true, initiatorAddr, initiatorSigner }) {
    const asset1OutAmount = util_1.applySlippageToAmount("negative", slippage, asset1Out);
    const asset2OutAmount = util_1.applySlippageToAmount("negative", slippage, asset2Out);
    const prevExcessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let { fees, confirmedRound } = await doBurn({
        client,
        pool,
        liquidityIn,
        asset1Out: asset1OutAmount,
        asset2Out: asset2OutAmount,
        initiatorAddr,
        initiatorSigner
    });
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
    if (redeemExcess) {
        if (excessAmountDeltaAsset1 > 0n) {
            const asset1RedeemOutput = await redeem_1.redeemExcessAsset({
                client,
                pool,
                assetID: pool.asset1ID,
                assetOut: excessAmountDeltaAsset1,
                initiatorAddr,
                initiatorSigner
            });
            fees += asset1RedeemOutput.fees;
        }
        if (excessAmountDeltaAsset2 > 0n) {
            const asset2RedeemOutput = await redeem_1.redeemExcessAsset({
                client,
                pool,
                assetID: pool.asset2ID,
                assetOut: excessAmountDeltaAsset2,
                initiatorAddr,
                initiatorSigner
            });
            fees += asset2RedeemOutput.fees;
        }
    }
    return {
        round: confirmedRound,
        fees,
        asset1ID: pool.asset1ID,
        asset1Out: asset1OutAmount + excessAmountDeltaAsset1,
        asset2ID: pool.asset2ID,
        asset2Out: asset2OutAmount + excessAmountDeltaAsset2,
        liquidityID: pool.liquidityTokenID,
        liquidityIn: BigInt(liquidityIn)
    };
}
exports.burnLiquidity = burnLiquidity;
