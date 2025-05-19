import algosdk from "algosdk";
import TinymanBaseClient from "../util/client/base/baseClient";
import { SupportedNetwork } from "../util/commonTypes";
declare class TinymanTAlgoClient extends TinymanBaseClient {
    constructor(algod: algosdk.Algodv2, network: SupportedNetwork);
    sync(userAddress: string): Promise<algosdk.Transaction[]>;
    mint(amount: bigint, userAddress: string): Promise<algosdk.Transaction[]>;
    burn(amount: bigint, userAddress: string): Promise<algosdk.Transaction[]>;
    /**
     * Retrieves the current ratio of ALGO to tALGO in base units.
     * The ratio is calculated as (algoAmount / tAlgoAmount) * 10^12.
     *
     * @returns {Promise<number>} The current ALGO to tALGO ratio.
     */
    getRatio(): Promise<number>;
    /**
     * Retrieves the circulating supply of minted tALGO in base units.
     *
     * @returns {Promise<bigint>}
     */
    getCirculatingSupply(): Promise<bigint>;
}
export { TinymanTAlgoClient };
