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
        constant_1.MINIMUM_BALANCE_REQUIRED_PER_ASSET * (account.assets || []).length +
        constant_1.MINIMUM_BALANCE_REQUIRED_PER_CREATED_APP * (account["created-apps"] || []).length +
        constant_1.MINIMUM_BALANCE_REQUIRED_PER_APP * (account["apps-local-state"] || []).length +
        constant_1.MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA *
            ((totalSchema && totalSchema["num-byte-slice"]) || 0) +
        constant_1.MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE *
            ((totalSchema && totalSchema["num-uint"]) || 0) +
        constant_1.MINIMUM_BALANCE_REQUIRED_PER_EXTRA_APP_PAGE * (account["apps-total-extra-pages"] || 0));
    // const minBalance =
    //   100000 + // min account balance 
    //   100000 + // min balance to create asset
    //   100000 + // fee + min balance to opt into asset 1
    //   (asset2Optin ? 100000 : 0) + // min balance to opt into asset 2
    //   100000 +
    //   (25000 + 3500) * VALIDATOR_APP_SCHEMA.numLocalInts +
    //   (25000 + 25000) * VALIDATOR_APP_SCHEMA.numLocalByteSlices; // min balance to opt into validator app
}
exports.calculateAccountMinimumRequiredBalance = calculateAccountMinimumRequiredBalance;
function hasSufficientMinimumBalance(accountData) {
    return accountData.amount >= accountData.minimum_required_balance;
}
exports.hasSufficientMinimumBalance = hasSufficientMinimumBalance;
