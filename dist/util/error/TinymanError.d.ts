type TinymanErrorType = "LogicError" | "SlippageTolerance" | "TransactionError" | "ExceedingExcessAmountCount" | "Unknown";
declare class TinymanError extends Error {
    data: any;
    type: TinymanErrorType;
    constructor(data: any, defaultMessage: string, ...args: any[]);
    setMessage(message: string): void;
    getErrorType(algoSDKMessage: string): TinymanErrorType;
    getErrorMessage(algoSDKMessage: string, type: TinymanErrorType, defaultMessage: string): any;
    extractMessageFromAlgoSDKError(data: any): string;
    private isMessageObjectString;
}
export default TinymanError;
