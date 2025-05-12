import algosdk, { Algodv2, Transaction } from "algosdk";
import { OrderType, PutOrderParams, PutRecurringOrderParams } from "./types";
import { SupportedNetwork } from "../util/commonTypes";
import TinymanNullableBaseClient from "../util/client/base/nullableBaseClient";
declare class OrderingClient extends TinymanNullableBaseClient {
    registryAppId: number;
    registryApplicationAddress: string;
    vaultAppId: number;
    vaultApplicationAddress: string;
    userAddress: string;
    private constructor();
    private static getRegistryEntryBoxName;
    private static getOrderApplicationId;
    /**
     *  Initialize the OrderingClient by fetching the personal app id from global state.
     *  Until the user creates an application, the app id will be set as null
     */
    static initializeOrderingClient(algod: Algodv2, network: SupportedNetwork, userAddress: string): Promise<OrderingClient>;
    shouldUpdateOrderingApp(): Promise<boolean>;
    updateOrderingApp(): Promise<Transaction[]>;
    calculateCreateOrderAppMinBalanceIncreaseAmount(): bigint;
    createOrderApp(userAddress: string): Promise<algosdk.Transaction[]>;
    checkOrderAppAvailability(orderAppId?: number): Promise<void>;
    getPutOrderTxnFee({ assetInId, assetOutId, type }: {
        assetInId: number;
        assetOutId: number;
        type: OrderType;
    }): Promise<bigint>;
    putOrder({ assetInId, assetOutId, assetInAmount, assetOutAmount, isPartialAllowed, duration }: PutOrderParams): Promise<algosdk.Transaction[]>;
    putRecurringOrder({ amount, assetId, targetAssetId, targetRecurrence, interval, maxTargetAmount, minTargetAmount }: PutRecurringOrderParams): Promise<algosdk.Transaction[]>;
    cancelOrder(orderId: number, type: OrderType): Promise<algosdk.Transaction[]>;
    getPlatformFeeRate(tinyPower: number | null): Promise<any>;
    private getOrderCount;
    private getOrderBoxName;
    private prepareOrderAppAssetOptInTxn;
    private prepareOrderAppAssetOptinTxnsIfNeeded;
    collect(orderId: number, type: OrderType): Promise<algosdk.Transaction[]>;
    private getAssetsToOptInToOrderingClient;
}
export { OrderingClient };
