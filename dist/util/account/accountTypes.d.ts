export interface AccountExcessWithinPool {
    excessAsset1: bigint;
    excessAsset2: bigint;
    excessPoolTokens: bigint;
}
export interface AccountExcess {
    poolAddress: string;
    assetID: number;
    amount: bigint;
}
