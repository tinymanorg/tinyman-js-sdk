export declare enum PoolStatus {
    NOT_CREATED = "not created",
    BOOTSTRAP = "bootstrap",
    READY = "ready",
    ERROR = "error"
}
export interface PoolInfo {
    addr: string;
    program: Uint8Array;
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
    liquidityTokenID?: number;
    status: PoolStatus;
}
declare const MINIMUM_LIQUIDITY = 1000;
export { MINIMUM_LIQUIDITY };
/**
 * Look up information about an pool.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to look up.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 */
export declare function getPoolInfo(client: any, pool: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
}): Promise<PoolInfo>;
/**
 * Create an pool for an asset pair if it does not already exist. The initiator will provide
 * funding to create the pool and pay for the creation transaction fees.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to create.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 * @param initiatorAddr The address of the account initiating creation.
 * @param initiatorSigner A function that will sign transactions from the initiator's account.
 */
export declare function createPool(client: any, pool: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
}, initiatorAddr: string, initiatorSigner: (txns: any[], index: number) => Promise<Uint8Array>): Promise<PoolInfo>;
export declare function getPoolReserves(client: any, pool: PoolInfo): Promise<{
    round: number;
    asset1: bigint;
    asset2: bigint;
    issuedLiquidity: bigint;
}>;
export declare function getAccountExcess({ client, pool, accountAddr, }: {
    client: any;
    pool: PoolInfo;
    accountAddr: string;
}): Promise<{
    excessAsset1: bigint;
    excessAsset2: bigint;
    excessLiquidityTokens: bigint;
}>;
