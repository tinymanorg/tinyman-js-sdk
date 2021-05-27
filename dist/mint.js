"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintLiquidity = exports.getMintLiquidityQuote = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const util_1 = require("./util");
const pool_1 = require("./pool");
const redeem_1 = require("./redeem");
const asset_transfer_1 = require("./asset-transfer");
const validator_1 = require("./validator");
/**
 * Get a quote for how many liquidity tokens a deposit of asset1In and asset2In is worth at this
 * moment. This does not execute any transactions.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 */
async function getMintLiquidityQuote({ client, pool, asset1In, asset2In }) {
    const reserves = await pool_1.getPoolReserves(client, pool);
    if (reserves.issuedLiquidity === 0n) {
        // TODO: compute sqrt on bigints
        const geoMean = BigInt(Math.floor(Math.sqrt(Number(asset1In) * Number(asset2In))));
        if (geoMean <= BigInt(pool_1.MINIMUM_LIQUIDITY)) {
            throw new Error(`Initial liquidity mint too small. Liquidity minting amount must be greater than ${pool_1.MINIMUM_LIQUIDITY}, this quote is for ${geoMean}.`);
        }
        return {
            round: reserves.round,
            asset1ID: pool.asset1ID,
            asset1In: BigInt(asset1In),
            asset2ID: pool.asset2ID,
            asset2In: BigInt(asset2In),
            liquidityID: pool.liquidityTokenID,
            liquidityOut: geoMean - BigInt(pool_1.MINIMUM_LIQUIDITY),
            share: 100n
        };
    }
    const asset1Ratio = (BigInt(asset1In) * reserves.issuedLiquidity) / reserves.asset1;
    const asset2Ratio = (BigInt(asset2In) * reserves.issuedLiquidity) / reserves.asset2;
    const liquidityOut = asset1Ratio < asset2Ratio ? asset1Ratio : asset2Ratio;
    return {
        round: reserves.round,
        asset1ID: pool.asset1ID,
        asset1In: BigInt(asset1In),
        asset2ID: pool.asset2ID,
        asset2In: BigInt(asset2In),
        liquidityID: pool.liquidityTokenID,
        liquidityOut,
        share: (100n * liquidityOut) / (reserves.issuedLiquidity + liquidityOut)
    };
}
exports.getMintLiquidityQuote = getMintLiquidityQuote;
const MINT_ENCODED = Uint8Array.from([109, 105, 110, 116]); // 'mint'
async function doMint({ client, pool, asset1In, asset2In, liquidityOut, initiatorAddr, initiatorSigner }) {
    const suggestedParams = await client.getTransactionParams().do();
    const validatorAppCallTxn = algosdk_1.default.makeApplicationNoOpTxnFromObject({
        from: pool.addr,
        appIndex: pool.validatorAppID,
        appArgs: [MINT_ENCODED],
        accounts: [initiatorAddr],
        suggestedParams
    });
    const asset1InTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        assetIndex: pool.asset1ID,
        amount: asset1In,
        suggestedParams
    });
    let asset2InTxn;
    if (pool.asset2ID === 0) {
        asset2InTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: initiatorAddr,
            to: pool.addr,
            amount: asset2In,
            suggestedParams
        });
    }
    else {
        asset2InTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: initiatorAddr,
            to: pool.addr,
            assetIndex: pool.asset2ID,
            amount: asset2In,
            suggestedParams
        });
    }
    const liquidityOutTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: pool.addr,
        to: initiatorAddr,
        assetIndex: pool.liquidityTokenID,
        amount: liquidityOut,
        suggestedParams
    });
    let txnFees = validatorAppCallTxn.fee + liquidityOutTxn.fee;
    const feeTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        amount: txnFees,
        note: Uint8Array.from([1]),
        suggestedParams
    });
    txnFees += asset1InTxn.fee + asset2InTxn.fee + feeTxn.fee;
    const txGroup = algosdk_1.default.assignGroupID([
        feeTxn,
        validatorAppCallTxn,
        asset1InTxn,
        asset2InTxn,
        liquidityOutTxn
    ]);
    const lsig = algosdk_1.default.makeLogicSig(pool.program);
    const signedFeeTxn = await initiatorSigner(txGroup, 0);
    const signedAsset1InTxn = await initiatorSigner(txGroup, 2);
    const signedAsset2InTxn = await initiatorSigner(txGroup, 3);
    const signedTxns = txGroup.map((txn, index) => {
        if (index === 0) {
            return signedFeeTxn;
        }
        if (index === 2) {
            return signedAsset1InTxn;
        }
        if (index === 3) {
            return signedAsset2InTxn;
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
 * Execute a mint operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.liquidityOut The quantity of liquidity tokens being withdrawn.
 * @param params.slippage The maximum acceptable slippage rate. Should be a number between 0 and 100
 *   and acts as a percentage of params.liquidityOut.
 * @param params.redeemExcess If true, any excess amount of the output liquidity created by this
 *   mint will be redeemed after the mint executes.
 * @param params.initiatorAddr The address of the account performing the mint operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function mintLiquidity({ client, pool, asset1In, asset2In, liquidityOut, slippage, redeemExcess, initiatorAddr, initiatorSigner }) {
    // apply slippage to liquidity out amount
    const liquidityOutAmount = util_1.applySlippageToAmount("negative", slippage, liquidityOut);
    const prevExcessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    await validator_1.optIntoValidatorIfNecessary({
        client,
        validatorAppID: pool.validatorAppID,
        initiatorAddr,
        initiatorSigner
    });
    await asset_transfer_1.optIntoAssetIfNecessary({
        client,
        assetID: pool.liquidityTokenID,
        initiatorAddr,
        initiatorSigner
    });
    let { fees, confirmedRound } = await doMint({
        client,
        pool,
        asset1In,
        asset2In,
        liquidityOut: liquidityOutAmount,
        initiatorAddr,
        initiatorSigner
    });
    const excessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let excessAmountDelta = excessAssets.excessLiquidityTokens - prevExcessAssets.excessLiquidityTokens;
    if (excessAmountDelta < 0n) {
        excessAmountDelta = 0n;
    }
    if (redeemExcess && excessAmountDelta > 0n) {
        const redeemOutput = await redeem_1.redeemExcessAsset({
            client,
            pool,
            assetID: pool.liquidityTokenID,
            assetOut: excessAmountDelta,
            initiatorAddr,
            initiatorSigner
        });
        fees += redeemOutput.fees;
    }
    return {
        round: confirmedRound,
        fees,
        asset1ID: pool.asset1ID,
        asset1In: BigInt(asset1In),
        asset2ID: pool.asset2ID,
        asset2In: BigInt(asset2In),
        liquidityID: pool.liquidityTokenID,
        liquidityOut: liquidityOutAmount + excessAmountDelta
    };
}
exports.mintLiquidity = mintLiquidity;
