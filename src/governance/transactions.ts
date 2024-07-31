import algosdk, {SuggestedParams} from "algosdk";
import {v4} from "uuid";

import {encodeString} from "../util/util";

function prepareBudgetIncreaseTxn({
  sender,
  index,
  suggestedParams,
  boxes = [],
  extraAppArgs = [],
  foreignApps = []
}: {
  sender: string;
  index: number;
  suggestedParams: SuggestedParams;
  extraAppArgs?: Uint8Array[];
  foreignApps?: number[];
  boxes?: algosdk.BoxReference[];
}) {
  const emptyBoxesCount = Math.max(0, 8 - foreignApps.length - boxes.length);
  const emptyBoxes = Array(emptyBoxesCount).fill({
    appIndex: 0,
    name: encodeString("")
  });

  const increaseBudgetTxnsBoxes = [...boxes, ...emptyBoxes];

  return algosdk.makeApplicationNoOpTxnFromObject({
    from: sender,
    suggestedParams,
    appIndex: index,
    appArgs: [encodeString("increase_budget"), ...extraAppArgs],
    foreignApps,
    boxes: increaseBudgetTxnsBoxes,
    // Make transactions unique to avoid "transaction already in ledger" error
    note: encodeString(v4())
  });
}

export {prepareBudgetIncreaseTxn};
