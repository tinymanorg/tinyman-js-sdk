"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optIntoAssetIfNecessary = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
const util_1 = require("./util");
async function optIntoAssetIfNecessary({ client, assetID, initiatorAddr, initiatorSigner }) {
    const account = (await client
        .accountInformation(initiatorAddr)
        .do());
    if (!account.assets.some((asset) => asset["asset-id"] === assetID)) {
        const suggestedParams = await client.getTransactionParams().do();
        const optInTxn = algosdk_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: initiatorAddr,
            to: initiatorAddr,
            assetIndex: assetID,
            amount: 0,
            suggestedParams
        });
        const [signedTxn] = await initiatorSigner([optInTxn]);
        const { txId } = await client.sendRawTransaction(signedTxn).do();
        await util_1.waitForTransaction(client, txId);
    }
}
exports.optIntoAssetIfNecessary = optIntoAssetIfNecessary;
