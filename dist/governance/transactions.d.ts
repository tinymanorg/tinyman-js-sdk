import algosdk, { SuggestedParams } from "algosdk";
declare function prepareBudgetIncreaseTxn({ sender, index, suggestedParams, boxes, extraAppArgs, foreignApps }: {
    sender: string;
    index: number;
    suggestedParams: SuggestedParams;
    extraAppArgs?: Uint8Array[];
    foreignApps?: number[];
    boxes?: algosdk.BoxReference[];
}): algosdk.Transaction;
export { prepareBudgetIncreaseTxn };
