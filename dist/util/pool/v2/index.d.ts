import { Algodv2 } from "algosdk";
import { SupportedNetwork } from "../../commonTypes";
import { V2PoolInfo, PoolReserves, PoolAssets } from "../poolTypes";
/**
 * @returns Information object for the pool with given arguments
 */
export declare function getPoolInfo(params: {
    client: Algodv2;
    network: SupportedNetwork;
    asset1ID: number;
    asset2ID: number;
}): Promise<V2PoolInfo>;
export declare function getPoolReserves(client: Algodv2, pool: V2PoolInfo): Promise<PoolReserves>;
export declare function getPoolAssets({ client, address, network }: {
    client: Algodv2;
    address: string;
    network: SupportedNetwork;
}): Promise<PoolAssets | null>;
