"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ALGOSDK_ERROR_MESSAGE_KEYWORDS = {
    SLIPPAGE_TOLERANCE_ERROR_INDICATOR: "- would result negative",
    LOGIC_ERROR_INDICATOR: "logic eval error:",
    TRANSACTION_ERROR_INDICATOR: /transaction \w+:/
};
class TinymanError extends Error {
    constructor(data, defaultMessage, ...args) {
        super(...args);
        const algoSDKMessage = this.extractMessageFromAlgoSDKError(data);
        this.data = data;
        this.type = this.getErrorType(algoSDKMessage);
        this.setMessage(this.getErrorMessage(algoSDKMessage, this.type, defaultMessage));
    }
    setMessage(message) {
        this.message = message;
    }
    getErrorType(algoSDKMessage) {
        let type = "Unknown";
        if (algoSDKMessage.includes(ALGOSDK_ERROR_MESSAGE_KEYWORDS.SLIPPAGE_TOLERANCE_ERROR_INDICATOR)) {
            type = "SlippageTolerance";
        }
        else if (algoSDKMessage.includes(ALGOSDK_ERROR_MESSAGE_KEYWORDS.LOGIC_ERROR_INDICATOR)) {
            type = "LogicError";
        }
        else if (algoSDKMessage.match(ALGOSDK_ERROR_MESSAGE_KEYWORDS.TRANSACTION_ERROR_INDICATOR)) {
            type = "TransactionError";
        }
        return type;
    }
    getErrorMessage(algoSDKMessage, type, defaultMessage) {
        let message;
        switch (type) {
            case "SlippageTolerance":
                message =
                    "The process failed due to too much slippage in the price. Please adjust the slippage tolerance and try again.";
                break;
            case "LogicError":
                message = algoSDKMessage.split(ALGOSDK_ERROR_MESSAGE_KEYWORDS.LOGIC_ERROR_INDICATOR)[1];
                break;
            case "TransactionError":
                message = algoSDKMessage.split(ALGOSDK_ERROR_MESSAGE_KEYWORDS.TRANSACTION_ERROR_INDICATOR)[1];
                break;
            case "Unknown":
                if (algoSDKMessage) {
                    message = algoSDKMessage;
                }
                break;
            default:
                break;
        }
        if (!message) {
            message = defaultMessage || "We encountered an unexpected error, try again later.";
        }
        return message.trim();
    }
    extractMessageFromAlgoSDKError(data) {
        let message = "";
        if (data?.response?.body?.message) {
            message = data.response.body.message;
        }
        else if (data?.response?.text) {
            message = data.response.text;
        }
        else if (typeof data?.message === "string") {
            message = this.isMessageObjectString(data?.message)
                ? JSON.parse(data.message || "{message: ''}").message
                : data.message;
        }
        // We assume this util will return string in other computations
        if (typeof message !== "string") {
            message = String(message);
        }
        return message;
    }
    isMessageObjectString(message) {
        return typeof message === "string" && message.includes("{message:");
    }
}
exports.default = TinymanError;
