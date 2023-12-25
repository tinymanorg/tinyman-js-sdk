/* eslint-disable no-magic-numbers */
import algosdk from "algosdk";

import {parseState} from "./utils";
import {ONE_14_DP, ONE_16_DP, SECONDS_IN_YEAR} from "./constants";

class FolksLendingPool {
  escrowAddress: string;

  // eslint-disable-next-line max-params
  constructor(
    public appId: number,
    public managerAppId: number,
    public depositInterestRate: number,
    public depositInterestIndex: number,
    public updatedAt: Date,
    public originalAssetId: number,
    public fAssetId: number
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

  /**
   * Calculates the amount original asset received according to fAsset amount when removing liquidity from lending pool.
   */
  convertRemoveAmount(amount: number, options: {ceil?: boolean} = {}): number {
    const interestIndex = this.calcDepositInterestIndex(this.getLastTimestamp());
    const converted = (amount * interestIndex) / ONE_14_DP;

    if (options.ceil) {
      return Math.ceil(converted);
    }

    return Math.floor(converted);
  }
}

/**
 * Fetches Folks lending pool application info from the algod, parses the global state and builds FolksLendingPool object.
 */
async function fetchFolksLendingPool(
  algod: algosdk.Algodv2,
  appId: number
): Promise<FolksLendingPool> {
  const appInfo = await algod.getApplicationByID(appId).do();
  const rawState = appInfo.params["global-state"];
  const state = parseState(rawState);

  const managerAppId = Number(Buffer.from(state.pm, "base64").readBigUInt64BE(0));

  const assetsIds = Buffer.from(state.a, "base64");

  const originalAssetId = Number(assetsIds.readBigUInt64BE(0));
  const fAssetId = Number(assetsIds.readBigUInt64BE(8));

  const interestInfo = Buffer.from(state.i, "base64");

  const depositInterestRate = Number(interestInfo.readBigUInt64BE(32));
  const depositInterestIndex = Number(interestInfo.readBigUInt64BE(40));
  const updatedAt = Number(interestInfo.readBigUInt64BE(48));

  return new FolksLendingPool(
    appId,
    managerAppId,
    depositInterestRate,
    depositInterestIndex,
    new Date(updatedAt * 1000),
    originalAssetId,
    fAssetId
  );
}

export {fetchFolksLendingPool, FolksLendingPool};
/* eslint-enable no-magic-numbers */
