"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSufficientMinimumBalance = exports.calculateAccountMinimumRequiredBalance = exports.getAccountInformation = void 0;
const constant_1 = require("../constant");
function getAccountInformation(client, address) {
    return new Promise(async (resolve, reject) => {
        try {
            const accountInfo = await client
                .accountInformation(address)
                .do();
            resolve({
                ...accountInfo,
                minimum_required_balance: calculateAccountMinimumRequiredBalance(accountInfo)
            });
        }
        catch (error) {
            reject(new Error(error.message || "Failed to fetch account information"));
        }
    });
}
exports.getAccountInformation = getAccountInformation;
function calculateAccountMinimumRequiredBalance(account) {
    const totalSchema = account["apps-total-schema"];
    return (constant_1.BASE_MINIMUM_BALANCE +
        (account.assets || []).length * constant_1.MINIMUM_BALANCE_REQUIRED_PER_ASSET +
        (account["apps-local-state"] || []).length * constant_1.MINIMUM_BALANCE_REQUIRED_PER_APP +
        ((totalSchema && totalSchema["num-byte-slice"]) || 0) * 50000 +
        ((totalSchema && totalSchema["num-uint"]) || 0) * 28500);
}
exports.calculateAccountMinimumRequiredBalance = calculateAccountMinimumRequiredBalance;
function hasSufficientMinimumBalance(accountData) {
    return accountData.amount >= accountData.minimum_required_balance;
}
exports.hasSufficientMinimumBalance = hasSufficientMinimumBalance;
