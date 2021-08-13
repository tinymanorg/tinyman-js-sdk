"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueSwap = exports.getSwapQuote = exports.generateSwapTransactions = exports.signSwapTransactions = exports.SwapType = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const util_1 = require("./util");
const pool_1 = require("./pool");
const constant_1 = require("./constant");
// FEE = %0.3 or 3/1000
const FEE_NUMERATOR = 3n;
const FEE_DENOMINATOR = 1000n;
var SwapType;
(function (SwapType) {
    SwapType["FixedInput"] = "fixed-input";
    SwapType["FixedOutput"] = "fixed-output";
})(SwapType = exports.SwapType || (exports.SwapType = {}));
const SWAP_ENCODED = Uint8Array.from([115, 119, 97, 112]); // 'swap'
const FIXED_INPUT_ENCODED = Uint8Array.from([102, 105]); // 'fi'
const FIXED_OUTPUT_ENCODED = Uint8Array.from([102, 111]); // 'fo'
var SwapTxnGroupIndices;
(function (SwapTxnGroupIndices) {
    SwapTxnGroupIndices[SwapTxnGroupIndices["FEE_TXN_INDEX"] = 0] = "FEE_TXN_INDEX";
    SwapTxnGroupIndices[SwapTxnGroupIndices["VALIDATOR_APP_CALL_TXN_INDEX"] = 1] = "VALIDATOR_APP_CALL_TXN_INDEX";
    SwapTxnGroupIndices[SwapTxnGroupIndices["ASSET_IN_TXN_INDEX"] = 2] = "ASSET_IN_TXN_INDEX";
    SwapTxnGroupIndices[SwapTxnGroupIndices["ASSET_OUT_TXN_INDEX"] = 3] = "ASSET_OUT_TXN_INDEX";
})(SwapTxnGroupIndices || (SwapTxnGroupIndices = {}));
async function signSwapTransactions({ pool, txGroup, initiatorSigner }) {
    const lsig = algosdk_1.default.makeLogicSig(pool.program);
    const [signedFeeTxn, signedAssetInTxn] = await initiatorSigner([
        txGroup[SwapTxnGroupIndices.FEE_TXN_INDEX],
        txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX]
    ]);
    const signedTxns = txGroup.map((txn, index) => {
        if (index === SwapTxnGroupIndices.FEE_TXN_INDEX) {
            return signedFeeTxn;
        }
        if (index === SwapTxnGroupIndices.ASSET_IN_TXN_INDEX) {
            return signedAssetInTxn;
        }
        const { blob } = algosdk_1.default.signLogicSigTransactionObject(txn, lsig);
        return blob;
    });
    return signedTxns;
}
exports.signSwapTransactions = signSwapTransactions;
async function generateSwapTransactions({ client, pool, swapType, assetIn, assetOut, slippage, initiatorAddr }) {
    const suggestedParams = await client.getTransactionParams().do();
    const validatorAppCallArgs = [
        SWAP_ENCODED,
        swapType === SwapType.FixedInput ? FIXED_INPUT_ENCODED : FIXED_OUTPUT_ENCODED
    ];
    const validatorAppCallTxn = algosdk_1.default.makeApplicationNoOpTxnFromObject({
        from: pool.addr,
        appIndex: pool.validatorAppID,
        appArgs: validatorAppCallArgs,
        accounts: [initiatorAddr],
        foreignAssets: pool.asset2ID == constant_1.ALGO_ASSET_ID
            ? [pool.asset1ID, pool.liquidityTokenID]
            : [pool.asset1ID, pool.asset2ID, pool.liquidityTokenID],
        suggestedParams
    });
    const assetInAmount = swapType === SwapType.FixedOutput
        ? util_1.applySlippageToAmount("positive", slippage, assetIn.amount)
        : assetIn.amount;
    let assetInTxn;
    if (assetIn.assetID === constant_1.ALGO_ASSET_ID) {
        assetInTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: initiatorAddr,
            to: pool.addr,
            amount: assetInAmount,
            suggestedParams
        });
    }
    else {
        assetInTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: initiatorAddr,
            to: pool.addr,
            assetIndex: assetIn.assetID,
            amount: assetInAmount,
            suggestedParams
        });
    }
    const assetOutAmount = swapType === SwapType.FixedInput
        ? util_1.applySlippageToAmount("negative", slippage, assetOut.amount)
        : assetOut.amount;
    let assetOutTxn;
    if (assetOut.assetID === constant_1.ALGO_ASSET_ID) {
        assetOutTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            amount: assetOutAmount,
            suggestedParams
        });
    }
    else {
        assetOutTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            assetIndex: assetOut.assetID,
            amount: assetOutAmount,
            suggestedParams
        });
    }
    const feeTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        amount: validatorAppCallTxn.fee + assetOutTxn.fee,
        suggestedParams
    });
    const txGroup = algosdk_1.default.assignGroupID([
        feeTxn,
        validatorAppCallTxn,
        assetInTxn,
        assetOutTxn
    ]);
    return txGroup;
}
exports.generateSwapTransactions = generateSwapTransactions;
/**
 * Get a quote for a fixed input swap This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetIn.amount The quantity of the input asset.
 */
async function getFixedInputSwapQuote({ client, pool, assetIn, decimals }) {
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
    const rate = util_1.convertFromBaseUnits(decimals.assetOut, Number(assetOutAmount)) /
        util_1.convertFromBaseUnits(decimals.assetIn, Number(assetInAmount));
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
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
async function fixedInputSwap({ client, pool, signedTxns, assetIn, assetOut, initiatorAddr }) {
    const prevExcessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let { confirmedRound, txnID } = await util_1.sendAndWaitRawTransaction(client, signedTxns);
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
    return {
        round: confirmedRound,
        assetInID: assetIn.assetID,
        assetInAmount: BigInt(assetIn.amount),
        assetOutID: assetOut.assetID,
        assetOutAmount: BigInt(assetOut.amount) + excessAmountDelta,
        excessAmount: {
            assetID: assetOut.assetID,
            excessAmountForSwap: excessAmountDelta,
            totalExcessAmount: excessAmount
        },
        txnID
    };
}
/**
 * Get a quote for a fixed output swap This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID.
 * @param params.assetOut.amount The quantity of the output asset.
 */
async function getFixedOutputSwapQuote({ client, pool, assetOut, decimals }) {
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
    const rate = util_1.convertFromBaseUnits(decimals.assetOut, Number(assetOutAmount)) /
        util_1.convertFromBaseUnits(decimals.assetIn, Number(assetInAmountPlusFee));
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
/**
 *
 * @param type - Type of the swap
 * @param pool - Information for the pool.
 * @param asset.assetID - ID of the asset to be swapped
 * @param asset.amount - Amount of the asset to be swapped
 * @param decimals.assetIn - Decimals quantity for the input asset
 * @param decimals.assetOut - Decimals quantity for the output asset
 * @returns A promise for the Swap quote
 */
function getSwapQuote(client, type, pool, asset, decimals) {
    let promise;
    if (type === "fixed-input") {
        promise = getFixedInputSwapQuote({
            client,
            pool,
            assetIn: asset,
            decimals
        });
    }
    else {
        promise = getFixedOutputSwapQuote({
            client,
            pool,
            assetOut: asset,
            decimals
        });
    }
    return promise;
}
exports.getSwapQuote = getSwapQuote;
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
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
async function fixedOutputSwap({ client, pool, signedTxns, assetIn, assetOut, initiatorAddr }) {
    const prevExcessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let { confirmedRound, txnID } = await util_1.sendAndWaitRawTransaction(client, signedTxns);
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
    return {
        round: confirmedRound,
        assetInID: assetIn.assetID,
        assetInAmount: BigInt(assetIn.amount) - excessAmountDelta,
        assetOutID: assetOut.assetID,
        assetOutAmount: BigInt(assetOut.amount),
        excessAmount: {
            assetID: assetIn.assetID,
            excessAmountForSwap: excessAmountDelta,
            totalExcessAmount: excessAmount
        },
        txnID
    };
}
/**
 * Execute a swap with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.swapType Type of the swap.
 * @param params.assetIn.assetID The ID of the input asset. Must be one of the pool's asset1ID
 *   or asset1ID.
 * @param params.assetIn.amount The desired quantity of the input asset.
 * @param params.assetOut.assetID The ID of the output asset. Must be one of the pool's asset1ID
 *   or asset2ID, and must be different than params.asset1In.assetID.
 * @param params.assetOut.amount The quantity of the output asset.
 * @param params.slippage The maximum acceptable slippage rate.
 * @param params.initiatorAddr The address of the account performing the swap operation.
 */
async function issueSwap({ client, pool, swapType, txGroup, signedTxns, initiatorAddr }) {
    const assetIn = {
        assetID: txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX].assetIndex || constant_1.ALGO_ASSET_ID,
        amount: txGroup[SwapTxnGroupIndices.ASSET_IN_TXN_INDEX].amount
    };
    const assetOut = {
        assetID: txGroup[SwapTxnGroupIndices.ASSET_OUT_TXN_INDEX].assetIndex || constant_1.ALGO_ASSET_ID,
        amount: txGroup[SwapTxnGroupIndices.ASSET_OUT_TXN_INDEX].amount
    };
    let swapData;
    if (swapType === SwapType.FixedInput) {
        swapData = await fixedInputSwap({
            client,
            pool,
            signedTxns,
            assetIn,
            assetOut,
            initiatorAddr
        });
    }
    else {
        swapData = await fixedOutputSwap({
            client,
            pool,
            signedTxns,
            assetIn,
            assetOut,
            initiatorAddr
        });
    }
    return { ...swapData, groupID: util_1.getTxnGroupID(txGroup), fees: util_1.sumUpTxnFees(txGroup) };
}
exports.issueSwap = issueSwap;
