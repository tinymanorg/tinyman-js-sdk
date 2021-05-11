import { PoolInfo } from './pool';
/**
 * Execute a redeem operation to collect excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or liquidityTokenID.
 * @param params.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function redeemExcessAsset({ client, pool, assetID, assetOut, initiatorAddr, initiatorSigner, }: {
    client: any;
    pool: PoolInfo;
    assetID: number;
    assetOut: number | bigint;
    initiatorAddr: string;
    initiatorSigner: (txns: any[], index: number) => Promise<Uint8Array>;
}): Promise<{
    fees: number;
    confirmedRound: number;
}>;
