import algosdk from "algosdk";

import {divScale, mulScale, parseState} from "./utils";
import {ONE_14_DP, ONE_16_DP, SECONDS_IN_YEAR} from "./constants";
import * as AddLiquidity from "./add-liquidity";
import * as RemoveLiquidity from "./remove-liquidity";

export class FolksLendingPool {
  escrowAddress: string;

  constructor(
    public appId: number,
    public managerAppId: number,
    private depositInterestRate: bigint,
    private depositInterestIndex: bigint,
    private lastUpdate: number
  ) {
    this.escrowAddress = algosdk.getApplicationAddress(this.appId);
  }

  private getLastTimestamp(): number {
    return this.lastUpdate ?? Math.floor(new Date().getTime() / 1000);
  }

  private getDepositInterestIndex() {
    const timestampDelta = BigInt(
      Math.floor(new Date().getTime() / 1000) - this.getLastTimestamp()
    );

    return mulScale(
      this.depositInterestIndex,
      ONE_16_DP + (this.depositInterestRate * timestampDelta) / SECONDS_IN_YEAR,
      ONE_16_DP
    );
  }

  /**
   * Calculates the amount fAsset received when adding liquidity with original asset.
   */
  calculateDepositReturn(depositAmount: number) {
    const depositInterestIndex = this.getDepositInterestIndex();

    return divScale(BigInt(depositAmount), depositInterestIndex, ONE_14_DP);
  }

  /**
   * Calculates the amount original asset received when removing liquidity from fAsset pool.
   */
  calculateWithdrawReturn(withdrawAmount: number) {
    const depositInterestIndex = this.getDepositInterestIndex();

    return mulScale(BigInt(withdrawAmount), depositInterestIndex, ONE_14_DP);
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
  const depositInterestRate = interestInfo.readBigUInt64BE(32);
  const depositInterestIndex = interestInfo.readBigUInt64BE(40);
  const lastUpdate = Number(interestInfo.readBigUInt64BE(48));

  return new FolksLendingPool(
    appId,
    managerAppId,
    depositInterestRate,
    depositInterestIndex,
    lastUpdate
  );
}

export const LendingPool = {AddLiquidity, RemoveLiquidity};
