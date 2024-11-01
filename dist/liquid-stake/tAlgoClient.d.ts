import algosdk from "algosdk";
import TinymanBaseClient from "../util/client/base/baseClient";
import { SupportedNetwork } from "../util/commonTypes";
declare class TinymanTAlgoClient extends TinymanBaseClient {
    constructor(algod: algosdk.Algodv2, network: SupportedNetwork);
    sync(userAddress: string): Promise<algosdk.Transaction[]>;
    mint(amount: number, userAddress: string): Promise<algosdk.Transaction[]>;
    burn(amount: number, userAddress: string): Promise<algosdk.Transaction[]>;
    getRatio(): Promise<number>;
    getCirculatingSupply(): Promise<number>;
}
export { TinymanTAlgoClient };
