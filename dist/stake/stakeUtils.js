"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStakingAppID = exports.prepareCommitTransactions = void 0;
const algosdk_1 = require("algosdk");
const util_1 = require("../util");
async function prepareCommitTransactions({ client, stakingAppID, initiatorAddr, liquidityAssetID, program, amount }) {
    const suggestedParams = await client.getTransactionParams().do();
    const amountEncoded = algosdk_1.encodeUint64(amount);
    const programIdEncoded = algosdk_1.encodeUint64(program.id);
    return [
        {
            txn: algosdk_1.makeApplicationNoOpTxnFromObject({
                appIndex: stakingAppID,
                from: initiatorAddr,
                suggestedParams,
                foreignAssets: [liquidityAssetID],
                accounts: [program.accountAddress],
                appArgs: [util_1.encodeString("commit"), amountEncoded, programIdEncoded],
                note: util_1.joinByteArrays([
                    util_1.encodeString("tinymanStaking/v1:b"),
                    programIdEncoded,
                    algosdk_1.encodeUint64(liquidityAssetID),
                    amountEncoded
                ])
            }),
            signers: [initiatorAddr]
        }
    ];
}
exports.prepareCommitTransactions = prepareCommitTransactions;
function getStakingAppID(network) {
    // TODO: fix the mainnet app id
    return network === "testnet" ? 51948952 : 0;
}
exports.getStakingAppID = getStakingAppID;
