export interface PutOrderParams {
    assetInId: number;
    assetOutId: number;
    assetInAmount: number;
    assetOutAmount: number;
    isPartialAllowed: boolean;
    duration: number;
    orderAppId?: number;
}
export interface PutRecurringOrderParams {
    assetId: number;
    amount: number;
    targetAssetId: number;
    targetRecurrence: number;
    interval: number;
    minTargetPrice: number;
    maxTargetPrice: number;
}
export declare enum OrderType {
    Limit = "trigger_order",
    Recurring = "recurring_order"
}
