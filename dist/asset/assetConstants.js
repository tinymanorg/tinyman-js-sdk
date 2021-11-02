"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIQUIDITY_TOKEN_UNIT_NAME = exports.ALGO_ASSET = exports.ALGO_ASSET_ID = exports.CACHED_ASSETS = void 0;
const WebStorage_1 = __importDefault(require("../web-storage/WebStorage"));
const cachedAssetsStoredValue = WebStorage_1.default.getFromWebStorage(WebStorage_1.default.STORED_KEYS.TINYMAN_CACHED_ASSETS);
exports.CACHED_ASSETS = (typeof cachedAssetsStoredValue === "object" ? cachedAssetsStoredValue : null) || {};
exports.ALGO_ASSET_ID = 0;
exports.ALGO_ASSET = {
    id: `${exports.ALGO_ASSET_ID}`,
    name: "Algorand",
    unit_name: "ALGO",
    decimals: 6,
    url: "https://algorand.org",
    is_liquidity_token: false,
    total_amount: "6615503326932151"
};
exports.LIQUIDITY_TOKEN_UNIT_NAME = "TM1POOL";
