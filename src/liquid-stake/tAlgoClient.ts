import algosdk, {encodeAddress} from "algosdk";

import TinymanBaseClient from "../util/client/base/baseClient";
import {encodeString} from "../util/util";
import {TALGO_ASSET_ID} from "../util/asset/assetConstants";
import {intToBytes} from "../governance/util/utils";
import {SupportedNetwork} from "../util/commonTypes";
import {STAKE_APP_ID} from "./constants";

class TinymanTAlgoClient extends TinymanBaseClient {
  constructor(algod: algosdk.Algodv2, network: SupportedNetwork) {
    super(algod, STAKE_APP_ID[network], network);
  }

  async sync(userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();

    const txns = [
      algosdk.makeApplicationNoOpTxnFromObject({
        from: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("sync")],
        suggestedParams,
        accounts: [
          encodeAddress(await this.getGlobal(encodeString("account_1"))),
          encodeAddress(await this.getGlobal(encodeString("account_2"))),
          encodeAddress(await this.getGlobal(encodeString("account_3"))),
          encodeAddress(await this.getGlobal(encodeString("account_4")))
        ]
      })
    ];

    return this.setupTxnFeeAndAssignGroupId({txns});
  }

  async mint(amount: number, userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();

    const txns = [
      ...(await this.getOptinTxnIfNeeded(userAddress, TALGO_ASSET_ID[this.network])),
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: userAddress,
        to: this.applicationAddress,
        amount,
        suggestedParams
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        from: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("mint"), intToBytes(amount)],
        accounts: [
          encodeAddress(await this.getGlobal(encodeString("account_1"))),
          encodeAddress(await this.getGlobal(encodeString("account_2"))),
          encodeAddress(await this.getGlobal(encodeString("account_3"))),
          encodeAddress(await this.getGlobal(encodeString("account_4")))
        ],
        suggestedParams,
        foreignAssets: [TALGO_ASSET_ID[this.network]]
      })
    ];

    return this.setupTxnFeeAndAssignGroupId({txns, additionalFeeCount: 4});
  }

  async burn(amount: number, userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();

    const txns = [
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: userAddress,
        to: this.applicationAddress,
        assetIndex: TALGO_ASSET_ID[this.network],
        amount,
        suggestedParams
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        from: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("burn"), intToBytes(amount)],
        accounts: [
          encodeAddress(await this.getGlobal(encodeString("account_1"))),
          encodeAddress(await this.getGlobal(encodeString("account_2"))),
          encodeAddress(await this.getGlobal(encodeString("account_3"))),
          encodeAddress(await this.getGlobal(encodeString("account_4")))
        ],
        suggestedParams
      })
    ];

    return this.setupTxnFeeAndAssignGroupId({txns, additionalFeeCount: 1});
  }

  /**
   * Retrieves the current ratio of ALGO to tALGO in base units.
   * The ratio is calculated as (algoAmount / tAlgoAmount) * 10^6.
   *
   * @returns {Promise<number>} The current ALGO to tALGO ratio.
   */
  getRatio(): Promise<number> {
    return this.getGlobal(encodeString("rate"));
  }

  /**
   * Retrieves the circulating supply of minted tALGO in base units.
   *
   * @returns {Promise<number>}
   */
  getCirculatingSupply(): Promise<number> {
    return this.getGlobal(encodeString("minted_talgo"));
  }
}

export {TinymanTAlgoClient};
