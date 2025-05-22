import algosdk, { Algodv2, Transaction } from "algosdk";
import { OrderType, PutTriggerOrderParams, PutRecurringOrderParams } from "./types";
import { SupportedNetwork } from "../util/commonTypes";
import TinymanBaseClient from "../util/client/base/baseClient";
declare class OrderingClient extends TinymanBaseClient<number | null, algosdk.Address | null> {
    registryAppId: number;
    registryApplicationAddress: string;
    vaultAppId: number;
    vaultApplicationAddress: string;
    routerAppId: number;
    routerApplicationAddress: string;
    userAddress: string;
    private constructor();
    private static getRegistryEntryBoxName;
    private static getOrderApplicationId;
    /**
     *  Initializes the OrderingClient by fetching the personal app id from global state.
     *  Until the user creates an application, the app id will be set as null
     */
    static initializeOrderingClient(algod: Algodv2, network: SupportedNetwork, userAddress: string): Promise<OrderingClient>;
    /**
     * Compares the contracts between the user's order app and the latest available contract.
     *
     * @returns A boolean indicating if the order app needs to be updated.
     */
    shouldUpdateOrderingApp(): Promise<boolean>;
    /**
     * Prepares transactions to update the ordering app using the latest contracts.
     * @returns A promise that resolves the transaction array.
     */
    prepareUpdateOrderingAppTransactions(): Promise<Transaction[]>;
    calculateCreateOrderAppMinBalanceIncreaseAmount(): bigint;
    /**
     * Prepares transactions to create the order app for a user.
     * @param userAddress - The address of the user.
     * @returns A promise that resolves the transaction array.
     */
    prepareCreateOrderAppTransactions(userAddress: string): Promise<algosdk.Transaction[]>;
    checkOrderAppAvailability(orderAppId?: number): Promise<void>;
    getPutTriggerOrderTransactionFee({ assetInId, assetOutId, type }: {
        assetInId: number;
        assetOutId: number;
        type: OrderType;
    }): Promise<bigint>;
    /**
     * Prepares an array of transactions to place a limit order.
     *
     * @param {PutTriggerOrderParams} params - The parameters for the put order operation.
     * @param params.assetInId - The ID of the input asset.
     * @param params.assetOutId - The ID of the output asset.
     * @param params.assetInAmount - The amount of the input asset in base units.
     * @param params.assetOutAmount - The amount of the output asset in base units.
     * @param params.isPartialAllowed - Whether partial fills are allowed.
     * @param params.duration - The duration of the order in seconds.
     * @param [params.orderAppId] - (Optional) The application ID for the order.
     * @returns A promise that resolves the transaction array.
     */
    preparePutTriggerOrderTransactions({ assetInId, assetOutId, assetInAmount, assetOutAmount, isPartialAllowed, duration }: PutTriggerOrderParams): Promise<algosdk.Transaction[]>;
    /**
     * Prepares an array of transactions to place a recurring order.
     *
     * @param {PutRecurringOrderParams} params - The parameters for the recurring order.
     * @param params.amount - The total amount of the asset to be used for the recurring order.
     * @param params.assetId - The ID of the asset being used for the order.
     * @param params.targetAssetId - The ID of the target asset for the order.
     * @param params.targetRecurrence - The number of times the order should recur.
     * @param params.interval - The interval between each recurrence in seconds.
     * @param params.maxTargetPrice - (Optional) The maximum price per unit of the target asset to be accepted.
     * @param params.minTargetPrice - (Optional) The minimum price per unit of the target asset to be accepted.
     * @returns A promise that resolves the transaction array.
     */
    preparePutRecurringOrderTransactions({ amount, assetId, targetAssetId, targetRecurrence, interval, maxTargetPrice, minTargetPrice }: PutRecurringOrderParams): Promise<algosdk.Transaction[]>;
    /**
     * Prepares an array of transactions to cancel an order.
     *
     * @param orderId - The ID of the order to cancel.
     * @param type - The type of the order to cancel.
     * @returns A promise that resolves the transaction array.
     */
    prepareCancelOrderTransactions(orderId: number, type: OrderType): Promise<algosdk.Transaction[]>;
    /**
     * Prepares an array of transactions to claim the collected target amount for an order.
     * @param orderId - The ID of the order for which to claim the collected target amount.
     * @param type - The type of the order (OrderType.Trigger or OrderType.Recurring).
     * @returns A promise that resolves the transaction array.
     */
    prepareClaimCollectedTargetAmount(orderId: number, type: OrderType): Promise<algosdk.Transaction[]>;
    /**
     * Gets the platform fee rate based on the provided tiny power from the global state.
     *
     * @param tinyPower - The tiny power to check against the threshold.
     * @returns The platform fee rate.
     */
    getPlatformFeeRate(tinyPower: number | null): Promise<number>;
    private getOrderCount;
    private getOrderBoxName;
    private getRegistryEntryBoxName;
    private prepareOrderAppAssetOptInTransaction;
    private prepareOrderAppAssetOptinTransactionsIfNeeded;
    private getAssetsToOptInToOrderingClient;
    private getLatestOrderAppVersion;
}
export { OrderingClient };
