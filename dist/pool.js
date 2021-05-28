"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountExcess = exports.getPoolReserves = exports.createPool = exports.getPoolInfo = exports.MINIMUM_LIQUIDITY = exports.PoolStatus = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const base64_js_1 = require("base64-js");
const algoswap_1 = require("algoswap");
const util_1 = require("./util");
const bootstrap_1 = require("./bootstrap");
var PoolStatus;
(function (PoolStatus) {
    PoolStatus["NOT_CREATED"] = "not created";
    PoolStatus["BOOTSTRAP"] = "bootstrap";
    PoolStatus["READY"] = "ready";
    PoolStatus["ERROR"] = "error";
})(PoolStatus = exports.PoolStatus || (exports.PoolStatus = {}));
exports.MINIMUM_LIQUIDITY = 1000;
/**
 * Look up information about an pool.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to look up.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 */
async function getPoolInfo(client, pool) {
    const poolLogicSig = algoswap_1.getPoolLogicSig(pool);
    let result = {
        addr: poolLogicSig.addr,
        program: poolLogicSig.program,
        validatorAppID: pool.validatorAppID,
        asset1ID: Math.max(pool.asset1ID, pool.asset2ID),
        asset2ID: Math.min(pool.asset1ID, pool.asset2ID),
        status: PoolStatus.NOT_CREATED
    };
    const info = (await client
        .accountInformation(poolLogicSig.addr)
        .do());
    for (const app of info["apps-local-state"]) {
        if (app.id !== pool.validatorAppID) {
            continue;
        }
        const keyValue = app["key-value"];
        const state = util_1.decodeState(keyValue);
        const asset1Key = "YTE="; // 'a1' in base64
        const asset2Key = "YTI="; // 'a2' in base64
        // The Liquidity Token is the only asset the Pool has created
        const liquidityTokenAsset = info["created-assets"][0];
        const liquidityTokenID = liquidityTokenAsset.index;
        result.asset1ID = state[asset1Key];
        result.asset2ID = state[asset2Key];
        result.liquidityTokenID = liquidityTokenID;
        result.status = PoolStatus.READY;
        return result;
    }
    return result;
}
exports.getPoolInfo = getPoolInfo;
/**
 * Create an pool for an asset pair if it does not already exist. The initiator will provide
 * funding to create the pool and pay for the creation transaction fees.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to create.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 * @param initiatorAddr The address of the account initiating creation.
 * @param initiatorSigner A function that will sign transactions from the initiator's account.
 */
async function createPool(client, pool, initiatorAddr, initiatorSigner) {
    const poolLogicSig = algoswap_1.getPoolLogicSig(pool);
    const { validatorAppID } = pool;
    const asset1ID = Math.max(pool.asset1ID, pool.asset2ID);
    const asset2ID = Math.min(pool.asset1ID, pool.asset2ID);
    await bootstrap_1.doBootstrap({
        client,
        poolLogicSig,
        validatorAppID,
        asset1ID,
        asset2ID,
        initiatorAddr,
        initiatorSigner
    });
    return getPoolInfo(client, pool);
}
exports.createPool = createPool;
const OUTSTANDING_ENCODED = Uint8Array.from([111]); // 'o'
const TOTAL_LIQUIDITY = 0xffffffffffffffffn;
async function getPoolReserves(client, pool) {
    const info = (await client
        .accountInformation(pool.addr)
        .setIntDecoding("bigint")
        .do());
    const appsLocalState = info["apps-local-state"] || [];
    let outstandingAsset1 = 0n;
    let outstandingAsset2 = 0n;
    let outstandingLiquidityTokens = 0n;
    for (const app of appsLocalState) {
        // eslint-disable-next-line eqeqeq
        if (app.id != pool.validatorAppID) {
            continue;
        }
        const keyValue = app["key-value"];
        if (!keyValue) {
            break;
        }
        const state = util_1.decodeState(keyValue);
        const outstandingAsset1Key = base64_js_1.fromByteArray(util_1.joinUint8Arrays([OUTSTANDING_ENCODED, algosdk_1.default.encodeUint64(pool.asset1ID)]));
        const outstandingAsset2Key = base64_js_1.fromByteArray(util_1.joinUint8Arrays([OUTSTANDING_ENCODED, algosdk_1.default.encodeUint64(pool.asset2ID)]));
        const outstandingLiquidityTokenKey = base64_js_1.fromByteArray(util_1.joinUint8Arrays([OUTSTANDING_ENCODED, algosdk_1.default.encodeUint64(pool.liquidityTokenID)]));
        const outstandingAsset1Value = state[outstandingAsset1Key];
        const outstandingAsset2Value = state[outstandingAsset2Key];
        const outstandingLiquidityTokenValue = state[outstandingLiquidityTokenKey];
        if (typeof outstandingAsset1Value === "bigint") {
            outstandingAsset1 = outstandingAsset1Value;
        }
        if (typeof outstandingAsset2Value === "bigint") {
            outstandingAsset2 = outstandingAsset2Value;
        }
        if (typeof outstandingLiquidityTokenValue === "bigint") {
            outstandingLiquidityTokens = outstandingLiquidityTokenValue;
        }
    }
    let asset1Balance = 0n;
    let asset2Balance = 0n;
    let liquidityTokenBalance = 0n;
    for (const asset of info.assets) {
        const id = asset["asset-id"];
        const { amount } = asset;
        /* eslint-disable eqeqeq */
        if (id == pool.asset1ID) {
            asset1Balance = BigInt(amount);
        }
        else if (id == pool.asset2ID) {
            asset2Balance = BigInt(amount);
        }
        else if (id == pool.liquidityTokenID) {
            liquidityTokenBalance = BigInt(amount);
        }
        /* eslint-enable eqeqeq */
    }
    if (pool.asset2ID === 0) {
        const minBalance = util_1.getMinBalanceForAccount(info);
        asset2Balance = BigInt(info.amount) - minBalance;
    }
    const reserves = {
        round: Number(info.round),
        asset1: asset1Balance - outstandingAsset1,
        asset2: asset2Balance - outstandingAsset2,
        issuedLiquidity: TOTAL_LIQUIDITY - liquidityTokenBalance + outstandingLiquidityTokens
    };
    if (reserves.asset1 < 0n ||
        reserves.asset2 < 0n ||
        reserves.issuedLiquidity < 0n ||
        reserves.issuedLiquidity > TOTAL_LIQUIDITY) {
        throw new Error(`Invalid reserves: ${reserves}`);
    }
    return reserves;
}
exports.getPoolReserves = getPoolReserves;
const EXCESS_ENCODED = Uint8Array.from([101]); // 'e'
async function getAccountExcess({ client, pool, accountAddr }) {
    const info = (await client
        .accountInformation(accountAddr)
        .setIntDecoding("bigint")
        .do());
    const appsLocalState = info["apps-local-state"] || [];
    let excessAsset1 = 0n;
    let excessAsset2 = 0n;
    let excessLiquidityTokens = 0n;
    for (const app of appsLocalState) {
        // eslint-disable-next-line eqeqeq
        if (app.id != pool.validatorAppID) {
            continue;
        }
        const keyValue = app["key-value"];
        if (!keyValue) {
            break;
        }
        const state = util_1.decodeState(keyValue);
        const excessAsset1Key = base64_js_1.fromByteArray(util_1.joinUint8Arrays([EXCESS_ENCODED, algosdk_1.default.encodeUint64(pool.asset1ID)]));
        const excessAsset2Key = base64_js_1.fromByteArray(util_1.joinUint8Arrays([EXCESS_ENCODED, algosdk_1.default.encodeUint64(pool.asset2ID)]));
        const excessLiquidityTokenKey = base64_js_1.fromByteArray(util_1.joinUint8Arrays([EXCESS_ENCODED, algosdk_1.default.encodeUint64(pool.liquidityTokenID)]));
        const excessAsset1Value = state[excessAsset1Key];
        const excessAsset2Value = state[excessAsset2Key];
        const excessLiquidityTokenValue = state[excessLiquidityTokenKey];
        if (typeof excessAsset1Value === "bigint") {
            excessAsset1 = excessAsset1Value;
        }
        if (typeof excessAsset2Value === "bigint") {
            excessAsset2 = excessAsset2Value;
        }
        if (typeof excessLiquidityTokenValue === "bigint") {
            excessLiquidityTokens = excessLiquidityTokenValue;
        }
    }
    const excessAssets = {
        excessAsset1,
        excessAsset2,
        excessLiquidityTokens
    };
    if (excessAssets.excessAsset1 < 0n ||
        excessAssets.excessAsset2 < 0n ||
        excessAssets.excessLiquidityTokens < 0n) {
        throw new Error(`Invalid excess assets: ${excessAssets}`);
    }
    return excessAssets;
}
exports.getAccountExcess = getAccountExcess;
