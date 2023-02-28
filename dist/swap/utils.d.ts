import { Algodv2 } from "algosdk";
import { CONTRACT_VERSION } from "../contract/constants";
import { AssetWithIdAndAmount } from "../util/asset/assetModels";
import { InitiatorSigner, SignerTransaction, SupportedNetwork } from "../util/commonTypes";
import { V1PoolInfo } from "../util/pool/poolTypes";
import { GetSwapQuoteBySwapTypeParams, GenerateSwapTxnsParams, GetSwapQuoteParams, SwapQuote } from "./types";
import { SwapType } from "./constants";
import { ContractVersionValue } from "../contract/types";
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
interface ExecuteCommonParams {
    swapType: SwapType;
    client: Algodv2;
    network: SupportedNetwork;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    assetIn: AssetWithIdAndAmount;
}
export declare function execute(params: ({
    contractVersion: typeof CONTRACT_VERSION.V1_1;
    initiatorAddr: string;
    pool: V1PoolInfo;
} | {
    contractVersion: typeof CONTRACT_VERSION.V2;
    quote: SwapQuote;
}) & ExecuteCommonParams): Promise<import("./types").V2SwapExecution> | Promise<import("./types").V1SwapExecution>;
/**
 * @returns the total fee that will be paid by the user
 * for the swap transaction with given parameters
 */
export declare function getSwapTotalFee(params: {
    version: typeof CONTRACT_VERSION.V1_1;
} | {
    version: typeof CONTRACT_VERSION.V2;
    type: SwapType;
}): number;
export declare function getContractVersionFromSwapQuote(quote: SwapQuote): ContractVersionValue;
export {};
