export declare const poolUtils: {
    getPoolShare(totalLiquidity: bigint, ownedLiquidity: bigint): number;
    getPoolPairRatio(reserves: Pick<import("./poolTypes").PoolReserves, "asset1" | "asset2"> | null): number | null;
    isPoolEmpty(poolReserves: Pick<import("./poolTypes").PoolReserves, "asset1" | "asset2"> | null | undefined): boolean;
    isPoolNotCreated(pool: import("./poolTypes").V1PoolInfo | import("./poolTypes").V2PoolInfo | null | undefined): boolean;
    isPoolReady(pool: import("./poolTypes").V1PoolInfo | import("./poolTypes").V2PoolInfo | null | undefined): boolean;
    getPoolsForPair(params: {
        client: import("algosdk").Algodv2;
        network: import("../commonTypes").SupportedNetwork;
        asset1ID: number;
        asset2ID: number;
    }): Promise<[import("./poolTypes").V1PoolInfo, import("./poolTypes").V2PoolInfo]>;
    v1_1: {
        getPoolShare(totalLiquidity: bigint, ownedLiquidity: bigint): number;
        getPoolPairRatio(reserves: Pick<import("./poolTypes").PoolReserves, "asset1" | "asset2"> | null): number | null;
        isPoolEmpty(poolReserves: Pick<import("./poolTypes").PoolReserves, "asset1" | "asset2"> | null | undefined): boolean;
        isPoolNotCreated(pool: import("./poolTypes").V1PoolInfo | import("./poolTypes").V2PoolInfo | null | undefined): boolean;
        isPoolReady(pool: import("./poolTypes").V1PoolInfo | import("./poolTypes").V2PoolInfo | null | undefined): boolean;
        getPoolsForPair(params: {
            client: import("algosdk").Algodv2;
            network: import("../commonTypes").SupportedNetwork;
            asset1ID: number;
            asset2ID: number;
        }): Promise<[import("./poolTypes").V1PoolInfo, import("./poolTypes").V2PoolInfo]>;
        getPoolInfo(params: {
            client: import("algosdk").Algodv2;
            network: import("../commonTypes").SupportedNetwork;
            asset1ID: number;
            asset2ID: number;
        }): Promise<import("./poolTypes").V1PoolInfo>;
        getPoolReserves(client: import("algosdk").Algodv2, pool: import("./poolTypes").V1PoolInfo): Promise<import("./poolTypes").PoolReserves>;
        getPoolAssets({ client, address, network }: {
            client: import("algosdk").Algodv2;
            address: string;
            network: import("../commonTypes").SupportedNetwork;
        }, cache?: Record<string, import("./poolTypes").PoolAssets>): Promise<import("./poolTypes").PoolAssets | null>;
    };
    v2: {
        getPoolShare(totalLiquidity: bigint, ownedLiquidity: bigint): number;
        getPoolPairRatio(reserves: Pick<import("./poolTypes").PoolReserves, "asset1" | "asset2"> | null): number | null;
        isPoolEmpty(poolReserves: Pick<import("./poolTypes").PoolReserves, "asset1" | "asset2"> | null | undefined): boolean;
        isPoolNotCreated(pool: import("./poolTypes").V1PoolInfo | import("./poolTypes").V2PoolInfo | null | undefined): boolean;
        isPoolReady(pool: import("./poolTypes").V1PoolInfo | import("./poolTypes").V2PoolInfo | null | undefined): boolean;
        getPoolsForPair(params: {
            client: import("algosdk").Algodv2;
            network: import("../commonTypes").SupportedNetwork;
            asset1ID: number;
            asset2ID: number;
        }): Promise<[import("./poolTypes").V1PoolInfo, import("./poolTypes").V2PoolInfo]>;
        getPoolInfo(params: {
            client: import("algosdk").Algodv2;
            network: import("../commonTypes").SupportedNetwork;
            asset1ID: number;
            asset2ID: number;
        }): Promise<import("./poolTypes").V2PoolInfo>;
        getPoolReserves(client: import("algosdk").Algodv2, pool: import("./poolTypes").V2PoolInfo): Promise<import("./poolTypes").PoolReserves>;
        getPoolAssets({ client, address, network }: {
            client: import("algosdk").Algodv2;
            address: string | import("algosdk").Address;
            network: import("../commonTypes").SupportedNetwork;
        }): Promise<import("./poolTypes").PoolAssets | null>;
    };
};
