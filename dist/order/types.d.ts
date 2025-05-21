export interface PutOrderParams {
    assetInId: number;
    assetOutId: number;
    assetInAmount: bigint;
    assetOutAmount: bigint;
    isPartialAllowed: boolean;
    duration: number;
    orderAppId?: number;
}
export interface PutRecurringOrderParams {
    assetId: number;
    amount: bigint;
    targetAssetId: number;
    targetRecurrence: number;
    interval: number;
    minTargetPrice: number;
    maxTargetPrice: number;
}
export declare enum OrderType {
    Trigger = "trigger_order",
    Recurring = "recurring_order"
}
