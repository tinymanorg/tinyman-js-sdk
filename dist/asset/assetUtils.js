"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNFT = exports.getAssetInformationById = exports.generateOptIntoAssetTxns = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const assetConstants_1 = require("./assetConstants");
const util_1 = require("../util");
const WebStorage_1 = __importDefault(require("../web-storage/WebStorage"));
async function generateOptIntoAssetTxns({ client, assetID, initiatorAddr }) {
    const suggestedParams = await client.getTransactionParams().do();
    const optInTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: initiatorAddr,
        assetIndex: assetID,
        amount: 0,
        suggestedParams
    });
    return [{ txn: optInTxn, signers: [initiatorAddr] }];
}
exports.generateOptIntoAssetTxns = generateOptIntoAssetTxns;
/**
 * Fetches asset data and caches it in a Map.
 * @param network "mainnet" | "testnet" | "hiponet".
 * @param {number} id - id of the asset
 * @param {boolean} alwaysFetch - Determines whether to always fetch the information of the asset or read it from the cache
 * @returns a promise that resolves with TinymanAnalyticsApiAsset
 */
function getAssetInformationById(network, id, alwaysFetch) {
    return new Promise(async (resolve, reject) => {
        try {
            if (id === assetConstants_1.ALGO_ASSET_ID) {
                resolve({ asset: assetConstants_1.ALGO_ASSET, isDeleted: false });
                return;
            }
            const memoizedValue = assetConstants_1.CACHED_ASSETS[`${id}`];
            if (memoizedValue &&
                // invalidate cache for this asset if total_amount is not available in the cached data
                memoizedValue.asset.total_amount != null &&
                !alwaysFetch) {
                resolve(memoizedValue);
                return;
            }
            const response = await fetch(`${util_1.getIndexerBaseURLForNetwork(network)}/assets/${id}?include-all=true`);
            const { asset } = (await response.json());
            const assetData = {
                id: `${asset.index}`,
                decimals: Number(asset.params.decimals),
                is_liquidity_token: false,
                name: asset.params.name || "",
                unit_name: asset.params["unit-name"] || "",
                url: "",
                total_amount: String(asset.params.total)
            };
            assetConstants_1.CACHED_ASSETS[`${id}`] = { asset: assetData, isDeleted: asset.deleted };
            WebStorage_1.default.local.setItem(WebStorage_1.default.STORED_KEYS.TINYMAN_CACHED_ASSETS, assetConstants_1.CACHED_ASSETS);
            resolve({ asset: assetData, isDeleted: asset.deleted });
        }
        catch (error) {
            reject(new Error(error.message || "Failed to fetch asset information"));
        }
    });
}
exports.getAssetInformationById = getAssetInformationById;
function isNFT(asset) {
    return parseFloat(asset.total_amount) === 1;
}
exports.isNFT = isNFT;
