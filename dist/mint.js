"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintLiquidity = exports.signMintTxns = exports.generateMintTxns = exports.getMintLiquidityQuote = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const util_1 = require("./util");
const pool_1 = require("./pool");
const constant_1 = require("./constant");
var MintTxnIndices;
(function (MintTxnIndices) {
    MintTxnIndices[MintTxnIndices["FEE_TXN"] = 0] = "FEE_TXN";
    MintTxnIndices[MintTxnIndices["VALIDATOR_APP_CALL_TXN"] = 1] = "VALIDATOR_APP_CALL_TXN";
    MintTxnIndices[MintTxnIndices["ASSET1_IN_TXN"] = 2] = "ASSET1_IN_TXN";
    MintTxnIndices[MintTxnIndices["ASSET2_IN_TXN"] = 3] = "ASSET2_IN_TXN";
    MintTxnIndices[MintTxnIndices["LIQUDITY_OUT_TXN"] = 4] = "LIQUDITY_OUT_TXN";
})(MintTxnIndices || (MintTxnIndices = {}));
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
            share: 1
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
        share: pool_1.getPoolShare(reserves.issuedLiquidity + liquidityOut, liquidityOut)
    };
}
exports.getMintLiquidityQuote = getMintLiquidityQuote;
const MINT_ENCODED = Uint8Array.from([109, 105, 110, 116]); // 'mint'
async function generateMintTxns({ client, pool, asset1In, asset2In, liquidityOut, slippage, initiatorAddr }) {
    // apply slippage to liquidity out amount
    const liquidityOutAmount = util_1.applySlippageToAmount("negative", slippage, liquidityOut);
    const suggestedParams = await client.getTransactionParams().do();
    const validatorAppCallTxn = algosdk_1.default.makeApplicationNoOpTxnFromObject({
        from: pool.addr,
        appIndex: pool.validatorAppID,
        appArgs: [MINT_ENCODED],
        accounts: [initiatorAddr],
        foreignAssets: pool.asset2ID == constant_1.ALGO_ASSET_ID
            ? [pool.asset1ID, pool.liquidityTokenID]
            : [pool.asset1ID, pool.asset2ID, pool.liquidityTokenID],
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
    if (pool.asset2ID === constant_1.ALGO_ASSET_ID) {
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
        amount: liquidityOutAmount,
        suggestedParams
    });
    const feeTxn = algosdk_1.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        amount: validatorAppCallTxn.fee + liquidityOutTxn.fee,
        note: constant_1.DEFAULT_FEE_TXN_NOTE,
        suggestedParams
    });
    return algosdk_1.default.assignGroupID([
        feeTxn,
        validatorAppCallTxn,
        asset1InTxn,
        asset2InTxn,
        liquidityOutTxn
    ]);
}
exports.generateMintTxns = generateMintTxns;
async function signMintTxns({ pool, txGroup, initiatorSigner }) {
    const lsig = algosdk_1.default.makeLogicSig(pool.program);
    const [signedFeeTxn, signedAsset1InTxn, signedAsset2InTxn] = await initiatorSigner([
        txGroup[MintTxnIndices.FEE_TXN],
        txGroup[MintTxnIndices.ASSET1_IN_TXN],
        txGroup[MintTxnIndices.ASSET2_IN_TXN]
    ]);
    const signedTxns = txGroup.map((txn, index) => {
        if (index === MintTxnIndices.FEE_TXN) {
            return signedFeeTxn;
        }
        if (index === MintTxnIndices.ASSET1_IN_TXN) {
            return signedAsset1InTxn;
        }
        if (index === MintTxnIndices.ASSET2_IN_TXN) {
            return signedAsset2InTxn;
        }
        const { blob } = algosdk_1.default.signLogicSigTransactionObject(txn, lsig);
        return blob;
    });
    return signedTxns;
}
exports.signMintTxns = signMintTxns;
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
 * @param params.initiatorAddr The address of the account performing the mint operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function mintLiquidity({ client, pool, txGroup, signedTxns, initiatorAddr }) {
    const liquidityOutAmount = BigInt(txGroup[MintTxnIndices.LIQUDITY_OUT_TXN].amount);
    const prevExcessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    const { confirmedRound, txnID } = await util_1.sendAndWaitRawTransaction(client, signedTxns);
    const fees = util_1.sumUpTxnFees(txGroup);
    const groupID = util_1.getTxnGroupID(txGroup);
    const excessAssets = await pool_1.getAccountExcess({
        client,
        pool,
        accountAddr: initiatorAddr
    });
    let excessAmountDelta = excessAssets.excessLiquidityTokens - prevExcessAssets.excessLiquidityTokens;
    if (excessAmountDelta < 0n) {
        excessAmountDelta = 0n;
    }
    return {
        round: confirmedRound,
        fees,
        liquidityID: pool.liquidityTokenID,
        liquidityOut: liquidityOutAmount + excessAmountDelta,
        excessAmount: {
            excessAmountForMinting: excessAmountDelta,
            totalExcessAmount: excessAssets.excessLiquidityTokens
        },
        txnID,
        groupID
    };
}
exports.mintLiquidity = mintLiquidity;
