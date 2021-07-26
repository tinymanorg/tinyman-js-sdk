"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixedOutputSwap = exports.getFixedOutputSwapQuote = exports.fixedInputSwap = exports.getFixedInputSwapQuote = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const util_1 = require("./util");
const pool_1 = require("./pool");
const redeem_1 = require("./redeem");
// FEE = %0.3 or 3/1000
const FEE_NUMERATOR = 3n;
const FEE_DENOMINATOR = 1000n;
const SWAP_ENCODED = Uint8Array.from([115, 119, 97, 112]); // 'swap'
const FIXED_INPUT_ENCODED = Uint8Array.from([102, 105]); // 'fi'
const FIXED_OUTPUT_ENCODED = Uint8Array.from([102, 111]); // 'fo'
async function doSwap({ client, pool, swapType, assetIn, assetOut, initiatorAddr, initiatorSigner }) {
    const suggestedParams = await client.getTransactionParams().do();
    const validatorAppCallArgs = [
        SWAP_ENCODED,
        swapType === "fixed input" ? FIXED_INPUT_ENCODED : FIXED_OUTPUT_ENCODED
    ];
    const validatorAppCallTxn = algosdk_1.default.makeApplicationNoOpTxnFromObject({
        from: pool.addr,
        appIndex: pool.validatorAppID,
        appArgs: validatorAppCallArgs,
        accounts: [initiatorAddr],
        foreignAssets: pool.asset2ID == 0
            ? [pool.asset1ID, pool.liquidityTokenID]
            : [pool.asset1ID, pool.asset2ID, pool.liquidityTokenID],
        suggestedParams
    });
    let assetInTxn;
    if (assetIn.assetID === 0) {
        assetInTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: initiatorAddr,
            to: pool.addr,
            amount: assetIn.amount,
            suggestedParams
        });
    }
    else {
        assetInTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: initiatorAddr,
            to: pool.addr,
            assetIndex: assetIn.assetID,
            amount: assetIn.amount,
            suggestedParams
        });
    }
    let assetOutTxn;
    if (assetOut.assetID === 0) {
        assetOutTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            amount: assetOut.amount,
            suggestedParams
        });
    }
    else {
        assetOutTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            assetIndex: assetOut.assetID,
            amount: assetOut.amount,
            suggestedParams
        });
    }
    let txnFees = validatorAppCallTxn.fee + assetOutTxn.fee;
    const feeTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        amount: txnFees,
        suggestedParams
    });
    txnFees += assetInTxn.fee + feeTxn.fee;
    const txGroup = algosdk_1.default.assignGroupID([
        feeTxn,
        validatorAppCallTxn,
        assetInTxn,
        assetOutTxn
    ]);
    const lsig = algosdk_1.default.makeLogicSig(pool.program);
    const [signedFeeTxn, signedAssetInTxn] = await initiatorSigner([
        txGroup[0],
        txGroup[2]
    ]);
    const signedTxns = txGroup.map((txn, index) => {
        if (index === 0) {
            return signedFeeTxn;
        }
        if (index === 2) {
            return signedAssetInTxn;
        }
        const { blob } = algosdk_1.default.signLogicSigTransactionObject(txn, lsig);
        return blob;
    });
    const { txId } = await client.sendRawTransaction(signedTxns).do();
    const status = await util_1.waitForTransaction(client, txId);
    const confirmedRound = status["confirmed-round"];
    return {
        fees: txnFees,
        confirmedRound,
        groupID: util_1.bufferToBase64(txGroup[0].group),
        txnID: txId
    };
}
/**
 * Get a quote for a fixed input swap This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetIn.amount The quantity of the input asset.
 */
async function getFixedInputSwapQuote({ client, pool, assetIn }) {
    const reserves = await pool_1.getPoolReserves(client, pool);
    const assetInAmount = BigInt(assetIn.amount);
    let assetOutID;
    let inputSupply;
    let outputSupply;
    if (assetIn.assetID === pool.asset1ID) {
        assetOutID = pool.asset2ID;
        inputSupply = reserves.asset1;
        outputSupply = reserves.asset2;
    }
    else {
        assetOutID = pool.asset1ID;
        inputSupply = reserves.asset2;
        outputSupply = reserves.asset1;
    }
    const swapFee = (assetInAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
    const assetInAmountMinusFee = assetInAmount - swapFee;
    const k = inputSupply * outputSupply;
    // k = (inputSupply + assetInAmountMinusFee) * (outputSupply - assetOutAmount)
    const assetOutAmount = outputSupply - k / (inputSupply + assetInAmountMinusFee);
    if (assetOutAmount > outputSupply) {
        throw new Error("Output amount exceeds available liquidity.");
    }
    const rate = Number(assetOutAmount) / Number(assetInAmount);
    return {
        round: reserves.round,
        assetInID: assetIn.assetID,
        assetInAmount,
        assetOutID,
        assetOutAmount,
        swapFee: Number(swapFee),
        rate
    };
}
exports.getFixedInputSwapQuote = getFixedInputSwapQuote;
/**
 * Execute a fixed input swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The quantity of the input asset.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The desired quantity of the output asset.
 * @param params.assetOut.slippage The maximum acceptable slippage rate. Should be a number between
 *   0 and 100 and acts as a percentage of params.assetOut.amount.
 * @param params.redeemExcess If true, any excess amount of the output asset created by this swap
 *   will be redeemed after the swap executes.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function fixedInputSwap({ client, pool, assetIn, assetOut, redeemExcess, initiatorAddr, initiatorSigner }) {
    // apply slippage to asset out amount
    const assetOutAmount = util_1.applySlippageToAmount("negative", assetOut.slippage, assetOut.amount);
    const prevExcessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let { fees, confirmedRound, groupID, txnID } = await doSwap({
        client,
        pool,
        swapType: "fixed input",
        assetIn,
        assetOut: {
            assetID: assetOut.assetID,
            amount: assetOutAmount
        },
        initiatorAddr,
        initiatorSigner
    });
    const excessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let prevExcessAmount;
    let excessAmount;
    if (assetOut.assetID === pool.asset1ID) {
        prevExcessAmount = prevExcessAssets.excessAsset1;
        excessAmount = excessAssets.excessAsset1;
    }
    else {
        prevExcessAmount = prevExcessAssets.excessAsset2;
        excessAmount = excessAssets.excessAsset2;
    }
    let excessAmountDelta = excessAmount - prevExcessAmount;
    if (excessAmountDelta < 0n) {
        excessAmountDelta = 0n;
    }
    if (redeemExcess && excessAmountDelta > 0n) {
        const redeemOutput = await redeem_1.redeemExcessAsset({
            client,
            pool,
            assetID: assetOut.assetID,
            assetOut: excessAmount,
            initiatorAddr,
            initiatorSigner
        });
        fees += redeemOutput.fees;
    }
    return {
        round: confirmedRound,
        fees,
        assetInID: assetIn.assetID,
        assetInAmount: BigInt(assetIn.amount),
        assetOutID: assetOut.assetID,
        assetOutAmount: assetOutAmount + excessAmountDelta,
        groupID,
        txnID
    };
}
exports.fixedInputSwap = fixedInputSwap;
/**
 * Get a quote for a fixed output swap This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetOut.amount The quantity of the output asset.
 */
async function getFixedOutputSwapQuote({ client, pool, assetOut }) {
    const reserves = await pool_1.getPoolReserves(client, pool);
    const assetOutAmount = BigInt(assetOut.amount);
    let assetInID;
    let inputSupply;
    let outputSupply;
    if (assetOut.assetID === pool.asset1ID) {
        assetInID = pool.asset2ID;
        inputSupply = reserves.asset2;
        outputSupply = reserves.asset1;
    }
    else {
        assetInID = pool.asset1ID;
        inputSupply = reserves.asset1;
        outputSupply = reserves.asset2;
    }
    if (assetOutAmount > outputSupply) {
        throw new Error("Output amount exceeds available liquidity.");
    }
    const k = inputSupply * outputSupply;
    // k = (inputSupply + assetInAmount) * (outputSupply - assetOutAmount)
    const assetInAmount = k / (outputSupply - assetOutAmount) - inputSupply;
    const swapFee = (assetInAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
    const assetInAmountPlusFee = assetInAmount + swapFee;
    const rate = Number(assetOutAmount) / Number(assetInAmountPlusFee);
    return {
        round: reserves.round,
        assetInID,
        assetInAmount: assetInAmountPlusFee,
        assetOutID: assetOut.assetID,
        assetOutAmount,
        swapFee: Number(swapFee),
        rate
    };
}
exports.getFixedOutputSwapQuote = getFixedOutputSwapQuote;
/**
 * Execute a fixed output swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The desired quantity of the input asset.
 * @param params.assetIn.slippage The maximum acceptable slippage rate. Should be a number greater
 *   or equal to 0 and acts as a percentage of params.assetIn.amount. NOTE: the initiating account
 *   must posses at least params.assetIn.amount * (100 + params.assetIn.slippage) / 100 units of the
 *   input asset in order for this transaction to be valid.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The quantity of the output asset.
 * @param params.redeemExcess If true, any excess amount of the input asset created by this swap
 *   will be redeemed after the swap executes.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function fixedOutputSwap({ client, pool, assetIn, assetOut, redeemExcess, initiatorAddr, initiatorSigner }) {
    // apply slippage to asset in amount
    const assetInAmount = util_1.applySlippageToAmount("positive", assetIn.slippage, assetIn.amount);
    const prevExcessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let { fees, confirmedRound, groupID, txnID } = await doSwap({
        client,
        pool,
        swapType: "fixed output",
        assetIn: {
            assetID: assetIn.assetID,
            amount: assetInAmount
        },
        assetOut,
        initiatorAddr,
        initiatorSigner
    });
    const excessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let prevExcessAmount;
    let excessAmount;
    if (assetIn.assetID === pool.asset1ID) {
        prevExcessAmount = prevExcessAssets.excessAsset1;
        excessAmount = excessAssets.excessAsset1;
    }
    else {
        prevExcessAmount = prevExcessAssets.excessAsset2;
        excessAmount = excessAssets.excessAsset2;
    }
    let excessAmountDelta = excessAmount - prevExcessAmount;
    if (excessAmountDelta < 0n) {
        excessAmountDelta = 0n;
    }
    if (redeemExcess && excessAmountDelta > 0n) {
        const redeemOutput = await redeem_1.redeemExcessAsset({
            client,
            pool,
            assetID: assetIn.assetID,
            assetOut: excessAmount,
            initiatorAddr,
            initiatorSigner
        });
        fees += redeemOutput.fees;
    }
    return {
        round: confirmedRound,
        fees,
        assetInID: assetIn.assetID,
        assetInAmount: assetInAmount - excessAmountDelta,
        assetOutID: assetOut.assetID,
        assetOutAmount: BigInt(assetOut.amount),
        groupID,
        txnID
    };
}
exports.fixedOutputSwap = fixedOutputSwap;
