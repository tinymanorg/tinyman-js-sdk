import algosdk, { Algodv2 } from "algosdk";
import TinymanBaseClient from "../../../util/client/base/baseClient";
import { SupportedNetwork } from "../../../util/commonTypes";
declare class SwapRouterClient extends TinymanBaseClient {
    ammAppId: number;
    talgoAppId: number;
    tAlgoAssetId: number;
    constructor(algod: Algodv2, network: SupportedNetwork);
    swap(userAddress: string, inputAmount: number, outputAmount: number, route: number[], pools: string[]): Promise<algosdk.Transaction[]>;
    private generateGroupedReferences;
}
export default SwapRouterClient;
