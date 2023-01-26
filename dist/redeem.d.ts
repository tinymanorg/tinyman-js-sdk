import { Algodv2 } from "algosdk";
import { InitiatorSigner, SignerTransaction } from "./util/commonTypes";
import { V1PoolInfo } from "./util/pool/poolTypes";
/**
 * Execute a redeem operation to collect excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function redeemExcessAsset({ client, pool, txGroup, initiatorSigner }: {
    client: Algodv2;
    pool: V1PoolInfo;
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<{
    fees: number;
    confirmedRound: number;
    groupID: string;
    txnID: string;
}>;
/**
 * Execute redeem operations to collect all excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.data.pool Information for the pool.
 * @param params.data.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or poolTokenID.
 * @param params.data.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function redeemAllExcessAsset({ client, data, initiatorSigner }: {
    client: Algodv2;
    data: {
        pool: V1PoolInfo;
        txGroup: SignerTransaction[];
    }[];
    initiatorSigner: InitiatorSigner;
}): Promise<{
    fees: number;
    confirmedRound: number;
    groupID: string;
    txnID: string;
}[]>;
export declare const REDEEM_PROCESS_TXN_COUNT = 3;
export declare function generateRedeemTxns({ client, pool, assetID, assetOut, initiatorAddr }: {
    client: Algodv2;
    pool: V1PoolInfo;
    assetID: number;
    assetOut: number | bigint;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
