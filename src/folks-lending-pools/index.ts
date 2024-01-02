import algosdk from "algosdk";

import {parseState} from "./utils";
import {ONE_14_DP, ONE_16_DP, SECONDS_IN_YEAR} from "./constants";
import * as AddLiquidity from "./add-liquidity";
import * as RemoveLiquidity from "./remove-liquidity";

export class FolksLendingPool {
  escrowAddress: string;

  // eslint-disable-next-line max-params
  constructor(
    public appId: number,
    public managerAppId: number,
    private depositInterestRate: number,
    private depositInterestIndex: number,
    private updatedAt: Date
  ) {
    this.escrowAddress = algosdk.getApplicationAddress(this.appId);
  }

  private calcDepositInterestIndex(timestamp: number): number {
    const dt = Math.floor(timestamp - Math.floor(this.updatedAt.getTime() / 1000));

    return Math.floor(
      (this.depositInterestIndex *
        Math.floor(ONE_16_DP + (this.depositInterestRate * dt) / SECONDS_IN_YEAR)) /
        ONE_16_DP
    );
  }

  private getLastTimestamp(): number {
    return Math.floor(new Date().getTime() / 1000);
  }

  /**
   * Calculates the amount fAsset received when adding liquidity with original asset.
   */
  convertAddAmount(amount: number): number {
    const interestIndex = this.calcDepositInterestIndex(this.getLastTimestamp());

    return Math.floor((amount * ONE_14_DP) / interestIndex);
  }
}

/**
 * Fetches Folks lending pool application info from the algod, parses the global state and builds FolksLendingPool object.
 */
export async function fetchFolksLendingPool(
  algod: algosdk.Algodv2,
  appId: number
): Promise<FolksLendingPool> {
  const appInfo = await algod.getApplicationByID(appId).do();
  const rawState = appInfo.params["global-state"];
  const state = parseState(rawState);

  const managerAppId = Number(Buffer.from(state.pm, "base64").readBigUInt64BE(0));

  const interestInfo = Buffer.from(state.i, "base64");
  const depositInterestRate = Number(interestInfo.readBigUInt64BE(32));
  const depositInterestIndex = Number(interestInfo.readBigUInt64BE(40));
  const updatedAt = Number(interestInfo.readBigUInt64BE(48));

  return new FolksLendingPool(
    appId,
    managerAppId,
    depositInterestRate,
    depositInterestIndex,
    new Date(updatedAt * 1000)
  );
}

export const LendingPool = {AddLiquidity, RemoveLiquidity};
