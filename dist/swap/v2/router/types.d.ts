import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { AssetWithIdAndAmount } from "../../../util/asset/assetModels";
import { SupportedNetwork } from "../../../util/commonTypes";
import { SwapType } from "../../constants";
export interface GenerateSwapRouterTxnsParams {
    client: AlgodClient;
    routerAppID: number;
    initiatorAddr: string;
    assetIn: AssetWithIdAndAmount;
    assetOut: AssetWithIdAndAmount;
    intermediaryAssetID: number;
    swapType: SwapType;
    network: SupportedNetwork;
}
