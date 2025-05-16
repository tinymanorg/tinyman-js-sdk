export interface PutOrderParams {
  assetInId: number;
  assetOutId: number;
  assetInAmount: number;
  assetOutAmount: number;
  isPartialAllowed: boolean;
  duration: number;
  // This field is needed the first time the order app is created by the user
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

export enum OrderType {
  Limit = "trigger_order",
  Recurring = "recurring_order"
}
