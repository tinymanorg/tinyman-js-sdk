"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOptedIntoValidator = exports.generateOptOutOfValidatorTxns = exports.OPT_OUT_VALIDATOR_APP_PROCESS_TXN_COUNT = exports.generateOptIntoValidatorTxns = exports.OPT_IN_VALIDATOR_APP_PROCESS_TXN_COUNT = exports.getValidatorAppIDForNetwork = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const constant_1 = require("./constant");
const CREATE_ENCODED = Uint8Array.from([99, 114, 101, 97, 116, 101]); // 'create'
/**
 * Get the Validator App ID for a network.
 *
 * @param network "mainnet" | "testnet" | "hiponet".
 *
 * @returns the Validator App ID for the network
 */
function getValidatorAppIDForNetwork(network) {
    let id;
    switch (network) {
        case "mainnet":
            id = constant_1.MAINNET_VALIDATOR_APP_ID;
            break;
        case "testnet":
            id = constant_1.TESTNET_VALIDATOR_APP_ID;
            break;
        case "hiponet":
            id = constant_1.HIPONET_VALIDATOR_APP_ID;
            break;
        default:
            throw new Error(`No Validator App exists for network ${network}`);
    }
    return id;
}
exports.getValidatorAppIDForNetwork = getValidatorAppIDForNetwork;
exports.OPT_IN_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;
async function generateOptIntoValidatorTxns({ client, validatorAppID, initiatorAddr }) {
    const suggestedParams = await client.getTransactionParams().do();
    const appOptInTxn = algosdk_1.default.makeApplicationOptInTxnFromObject({
        from: initiatorAddr,
        appIndex: validatorAppID,
        suggestedParams
    });
    return [{ txn: appOptInTxn, signers: [initiatorAddr] }];
}
exports.generateOptIntoValidatorTxns = generateOptIntoValidatorTxns;
exports.OPT_OUT_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;
async function generateOptOutOfValidatorTxns({ client, validatorAppID, initiatorAddr }) {
    const suggestedParams = await client.getTransactionParams().do();
    const appClearStateTxn = algosdk_1.default.makeApplicationClearStateTxnFromObject({
        from: initiatorAddr,
        appIndex: validatorAppID,
        suggestedParams
    });
    return [{ txn: appClearStateTxn, signers: [initiatorAddr] }];
}
exports.generateOptOutOfValidatorTxns = generateOptOutOfValidatorTxns;
/**
 * Checks if an account is opted into the Validator app.
 *
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.accountAppsLocalState Array of app local states for an account.
 * @returns True if and only if the indicated account has opted into the Validator App.
 */
function isOptedIntoValidator({ validatorAppID, accountAppsLocalState }) {
    return accountAppsLocalState.some((appState) => appState.id === validatorAppID);
}
exports.isOptedIntoValidator = isOptedIntoValidator;
