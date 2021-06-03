"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendValidatorAppCreationTransaction = exports.getValidatorAppCreationTransaction = exports.isOptedIntoValidator = exports.closeOutOfValidator = exports.optIntoValidator = exports.getvalidatorAppID = void 0;
const assert_1 = __importDefault(require("assert"));
const algosdk_1 = __importDefault(require("algosdk"));
const algoswap_contracts_v1_1 = require("algoswap-contracts-v1");
const util_1 = require("./util");
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
    const genesisHash = params["genesis-hash"];
    const genesisID = params["genesis-id"];
    if (genesisID === "mainnet-v1.0" &&
        genesisHash === "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=") {
        // TODO: return mainnet validator app ID
    }
    if (genesisID === "testnet-v1.0" &&
        genesisHash === "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=") {
        // TODO: return testnet validator app ID
    }
    if (genesisID === "betanet-v1.0" &&
        genesisHash === "mFgazF+2uRS1tMiL9dsj01hJGySEmPN28B/TjjvpVW0=") {
        // TODO: return betanet validator app ID
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
async function closeOutOfValidator({ client, validatorAppID, initiatorAddr, initiatorSigner }) {
    const suggestedParams = await client.getTransactionParams().do();
    const appCloseOutTxn = algosdk_1.default.makeApplicationCloseOutTxnFromObject({
        from: initiatorAddr,
        appIndex: validatorAppID,
        suggestedParams
    });
    const [signedTxn] = await initiatorSigner([appCloseOutTxn]);
    const { txId } = await client.sendRawTransaction(signedTxn).do();
    await util_1.waitForTransaction(client, txId);
}
exports.closeOutOfValidator = closeOutOfValidator;
/**
 * Check if an account is opted into the Validator app.
 *
 * @param params.client An Algodv2 client.
 * @param params.validatorAppID The ID of the Validator App for the network.
 * @param params.account The address of the account to check.
 *
 * @returns A promise that resolve to true if and only if the indicated account has opted into the
 *   pool's pair app.
 */
async function isOptedIntoValidator({ client, validatorAppID, initiatorAddr }) {
    const info = (await client
        .accountInformation(initiatorAddr)
        .setIntDecoding("mixed")
        .do());
    const appsLocalState = info["apps-local-state"] || [];
    for (const app of appsLocalState) {
        if (app.id === validatorAppID) {
            return true;
        }
    }
    return false;
}
exports.isOptedIntoValidator = isOptedIntoValidator;
async function getValidatorAppCreationTransaction(client, addr) {
    const suggestedParams = await client.getTransactionParams().do();
    const appCreateTxn = algosdk_1.default.makeApplicationCreateTxnFromObject({
        from: addr,
        onComplete: algosdk_1.default.OnApplicationComplete.NoOpOC,
        approvalProgram: algoswap_contracts_v1_1.validatorApprovalContract,
        clearProgram: algoswap_contracts_v1_1.validatorClearStateContract,
        numLocalInts: algoswap_contracts_v1_1.VALIDATOR_APP_SCHEMA.numLocalInts,
        numLocalByteSlices: algoswap_contracts_v1_1.VALIDATOR_APP_SCHEMA.numLocalByteSlices,
        numGlobalInts: algoswap_contracts_v1_1.VALIDATOR_APP_SCHEMA.numGlobalInts,
        numGlobalByteSlices: algoswap_contracts_v1_1.VALIDATOR_APP_SCHEMA.numGlobalByteSlices,
        appArgs: [CREATE_ENCODED],
        suggestedParams
    });
    return appCreateTxn;
}
exports.getValidatorAppCreationTransaction = getValidatorAppCreationTransaction;
async function sendValidatorAppCreationTransaction(client, stx) {
    const tx = await client.sendRawTransaction(stx).do();
    console.log("Signed transaction with txID: %s", tx.txId);
    const result = await util_1.waitForTransaction(client, tx.txId);
    const appID = result["application-index"];
    assert_1.default.ok(typeof appID === "number" && appID > 0);
    return appID;
}
exports.sendValidatorAppCreationTransaction = sendValidatorAppCreationTransaction;
