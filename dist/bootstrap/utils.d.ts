import { Algodv2 } from "algosdk";
import { ContractVersionValue } from "../contract/types";
import { TinymanAnalyticsApiAsset } from "../util/asset/assetModels";
import { SupportedNetwork, SignerTransaction, InitiatorSigner } from "../util/commonTypes";
import { PoolInfo } from "../util/pool/poolTypes";
export declare function generateTxns({ client, network, contractVersion, asset_1, asset_2, initiatorAddr }: {
    client: Algodv2;
    network: SupportedNetwork;
    contractVersion: ContractVersionValue;
    asset_1: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
    asset_2: Pick<TinymanAnalyticsApiAsset, "id" | "unit_name">;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
export declare function signTxns(params: {
    contractVersion: ContractVersionValue;
    txGroup: SignerTransaction[];
    network: SupportedNetwork;
    initiatorSigner: InitiatorSigner;
    asset1ID: number;
    asset2ID: number;
}): Promise<{
    signedTxns: Uint8Array[];
    txnIDs: string[];
}>;
export declare function execute(params: {
    client: Algodv2;
    contractVersion: ContractVersionValue;
    network: SupportedNetwork;
    pool: {
        asset1ID: number;
        asset2ID: number;
    };
    signedTxns: Uint8Array[];
    txnIDs: string[];
}): Promise<PoolInfo>;
/**
 * TODO: Do we need `calculateBootstrapFundingTxnAmount` instead of
 * separate functions for v1 and v2?
 */
/**
 * TODO: `function getMinBalanceRequiredToCreatePool({`
 *  * Calculates the minimum Algo balance an account should have to be able to create a pool
 *  Implementation will be similar to Web Client's `minRequiredBalanceToCreatePool`. So, the amount will be: currentMinBalanceForAccount + fundingTxnAmount + totalFees
 */
