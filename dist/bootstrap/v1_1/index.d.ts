import { Algodv2 } from "algosdk";
import { InitiatorSigner, SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { PoolInfo } from "../../util/pool/poolTypes";
declare function generateTxns({ client, network, asset1ID, asset2ID, asset1UnitName, asset2UnitName, initiatorAddr }: {
    client: Algodv2;
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
    asset1UnitName: string;
    asset2UnitName: string;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
declare function signTxns({ txGroup, network, initiatorSigner, asset1ID, asset2ID }: {
    txGroup: SignerTransaction[];
    network: SupportedNetwork;
    initiatorSigner: InitiatorSigner;
    asset1ID: number;
    asset2ID: number;
}): Promise<{
    signedTxns: Uint8Array[];
    txnIDs: string[];
}>;
/**
 * Create an pool for an asset pair if it does not already exist. The initiator will provide
 * funding to create the pool and pay for the creation transaction fees.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to create.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 * @param signedTxns Signed transactions
 * @param txnIDs Transaction IDs
 */
declare function execute({ client, network, pool, signedTxns, txnIDs }: {
    client: Algodv2;
    network: SupportedNetwork;
    pool: {
        asset1ID: number;
        asset2ID: number;
    };
    signedTxns: Uint8Array[];
    txnIDs: string[];
}): Promise<PoolInfo>;
export declare const BootstrapV1_1: {
    generateTxns: typeof generateTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
};
export {};
