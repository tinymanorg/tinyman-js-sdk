export interface PutTriggerOrderParams {
  assetInId: number;
  assetOutId: number;
  assetInAmount: bigint;
  assetOutAmount: bigint;
  isPartialAllowed: boolean;
  duration: number;
  // This field is needed the first time the order app is created by the user
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

export enum OrderType {
  Trigger = "trigger_order",
  Recurring = "recurring_order"
}
