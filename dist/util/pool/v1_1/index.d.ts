import { Algodv2 } from "algosdk";
import { PoolInfo, PoolReserves, PoolAssets } from "../poolTypes";
import { SupportedNetwork } from "../../commonTypes";
export declare function getPoolInfo(params: {
    client: Algodv2;
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
}): Promise<PoolInfo>;
export declare function getPoolReserves(client: Algodv2, pool: PoolInfo): Promise<PoolReserves>;
/**
 * Find out the ids of a pool's liquidity token and assets
 */
export declare function getPoolAssets({ client, address, network }: {
    client: Algodv2;
    address: string;
    network: SupportedNetwork;
}, cache?: Record<string, PoolAssets>): Promise<PoolAssets | null>;
