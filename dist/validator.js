"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOptedIntoValidator = exports.optOutOfValidator = exports.optIntoValidator = exports.getvalidatorAppID = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const util_1 = require("./util");
const constant_1 = require("./constant");
const CREATE_ENCODED = Uint8Array.from([99, 114, 101, 97, 116, 101]); // 'create'
/**
 * Get the Validator App ID for a network.
 *
 * @param client An Algodv2 client.
 *
 * @returns A Promise that resolves to the Validator App ID for the network that client is connected
 *   to.
 */
async function getvalidatorAppID(client) {
    const params = await client.getTransactionParams().do();
    const { genesisHash, genesisID } = params;
    if (genesisID === "mainnet-v1.0" &&
        genesisHash === "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=") {
        return constant_1.MAINNET_VALIDATOR_APP_ID;
    }
    if (genesisID === "testnet-v1.0" &&
        genesisHash === "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=") {
        return constant_1.TESTNET_VALIDATOR_APP_ID;
    }
    if (genesisID === "hiponet-v1" &&
        genesisHash === "1Ok6UoiCtb3ppI8rWSXxB3ddULOkqugfCB4FGcPFkpE=") {
        return constant_1.HIPONET_VALIDATOR_APP_ID;
    }
    throw new Error(`No Validator App exists for network ${genesisID}`);
}
exports.getvalidatorAppID = getvalidatorAppID;
/**
 * Opt into the validator app.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.initiatorAddr The address of the account opting in.
 * @param params.initiatorSigner A function that will sign  transactions from the initiator's
 *   account.
 */
async function optIntoValidator({ client, validatorAppID, initiatorAddr, initiatorSigner }) {
    const suggestedParams = await client.getTransactionParams().do();
    const appOptInTxn = algosdk_1.default.makeApplicationOptInTxnFromObject({
        from: initiatorAddr,
        appIndex: validatorAppID,
        suggestedParams
    });
    const [signedTxn] = await initiatorSigner([appOptInTxn]);
    const { txId } = await client.sendRawTransaction(signedTxn).do();
    await util_1.waitForTransaction(client, txId);
}
exports.optIntoValidator = optIntoValidator;
/**
 * Close out of the Validator app. WARNING: Make sure to redeem ALL excess asset amounts
 * before closing out of the validator, otherwise those assets will be returned to Pools.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.initiatorAddr The address of the account closing out.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
async function optOutOfValidator({ client, validatorAppID, initiatorAddr, initiatorSigner }) {
    const suggestedParams = await client.getTransactionParams().do();
    const appClearStateTxn = algosdk_1.default.makeApplicationClearStateTxnFromObject({
        from: initiatorAddr,
        appIndex: validatorAppID,
        suggestedParams
    });
    const [signedTxn] = await initiatorSigner([appClearStateTxn]);
    const { txId } = await client.sendRawTransaction(signedTxn).do();
    await util_1.waitForTransaction(client, txId);
}
exports.optOutOfValidator = optOutOfValidator;
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
