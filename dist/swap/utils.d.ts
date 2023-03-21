import { CONTRACT_VERSION } from "../contract/constants";
import { InitiatorSigner, SignerTransaction } from "../util/commonTypes";
import { V1PoolInfo } from "../util/pool/poolTypes";
import { GetSwapQuoteBySwapTypeParams, GenerateSwapTxnsParams, GetSwapQuoteParams, SwapQuote, ExecuteSwapCommonParams } from "./types";
/**
 * Gets the best quote for swap from the pools and swap router and returns the best option.
 */
export declare function getQuote(params: GetSwapQuoteParams): Promise<SwapQuote>;
/**
 * Gets quotes for fixed input swap the pools and swap router,
 * and returns the best quote (with the highest rate).
 */
export declare function getFixedInputSwapQuote(params: GetSwapQuoteBySwapTypeParams): Promise<SwapQuote>;
/**
 * Gets quotes for fixed output swap from the pools and swap router,
 * and returns the best quote (with the highest rate).
 */
export declare function getFixedOutputSwapQuote(params: GetSwapQuoteBySwapTypeParams): Promise<SwapQuote>;
export declare function generateTxns(params: GenerateSwapTxnsParams): Promise<SignerTransaction[]>;
export declare function signTxns(params: {
    quote: SwapQuote;
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
export declare function execute(params: ({
    contractVersion: typeof CONTRACT_VERSION.V1_1;
    initiatorAddr: string;
    pool: V1PoolInfo;
} | {
    contractVersion: typeof CONTRACT_VERSION.V2;
    quote: SwapQuote;
}) & ExecuteSwapCommonParams): Promise<import("./types").V2SwapExecution> | Promise<import("./types").V1SwapExecution>;
