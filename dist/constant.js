"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FEE_TXN_NOTE = exports.LIQUIDITY_TOKEN_UNIT_NAME = exports.ALGO_ASSET = exports.ALGO_ASSET_ID = exports.MAINNET_VALIDATOR_APP_ID = exports.HIPONET_VALIDATOR_APP_ID = exports.TESTNET_VALIDATOR_APP_ID = exports.MAX_SLIPPAGE_FRACTION_DIGITS = void 0;
exports.MAX_SLIPPAGE_FRACTION_DIGITS = 6;
exports.TESTNET_VALIDATOR_APP_ID = 21580889;
exports.HIPONET_VALIDATOR_APP_ID = 448;
exports.MAINNET_VALIDATOR_APP_ID = 0;
exports.ALGO_ASSET_ID = 0;
exports.ALGO_ASSET = {
    id: `${exports.ALGO_ASSET_ID}`,
    name: "Algorand",
    unit_name: "ALGO",
    decimals: 6,
    url: "https://algorand.org",
    is_liquidity_token: false
};
exports.LIQUIDITY_TOKEN_UNIT_NAME = "TM1POOL";
// The fee paying transaction at group index 0 should have a note value set to distinguish it from other Pay transactions in the group which might have the exact same value.
exports.DEFAULT_FEE_TXN_NOTE = Uint8Array.from([1]);
