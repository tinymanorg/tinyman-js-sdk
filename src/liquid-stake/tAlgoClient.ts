import algosdk, {bigIntToBytes, encodeAddress} from "algosdk";

import {TALGO_ASSET_ID} from "../util/asset/assetConstants";
import TinymanBaseClient from "../util/client/base/baseClient";
import {SupportedNetwork} from "../util/commonTypes";
import {encodeString} from "../util/util";
import {STAKE_APP_ID, STAKE_RATIO_COEFFICIENT} from "./constants";

class TinymanTAlgoClient extends TinymanBaseClient {
  constructor(algod: algosdk.Algodv2, network: SupportedNetwork) {
    super(algod, STAKE_APP_ID[network], network);
  }

  async sync(userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();

    const txns = [
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
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

  async mint(amount: bigint, userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();

    const txns = [
      ...(await this.getOptinTxnIfNeeded(userAddress, TALGO_ASSET_ID[this.network])),
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: userAddress,
        receiver: this.applicationAddress,
        amount,
        suggestedParams
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("mint"), bigIntToBytes(amount, 8)],
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

    return this.setupTxnFeeAndAssignGroupId({txns, additionalFeeCount: 1});
  }

  async burn(amount: bigint, userAddress: string) {
    const suggestedParams = await this.getSuggestedParams();

    const txns = [
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: userAddress,
        receiver: this.applicationAddress,
        assetIndex: TALGO_ASSET_ID[this.network],
        amount,
        suggestedParams
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
        appIndex: this.appId,
        appArgs: [encodeString("burn"), bigIntToBytes(amount, 8)],
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
   * The ratio is calculated as (algoAmount / tAlgoAmount) * 10^12.
   *
   * @returns {Promise<number>} The current ALGO to tALGO ratio.
   */
  async getRatio(): Promise<number> {
    return Number(await this.getGlobal(encodeString("rate"))) / STAKE_RATIO_COEFFICIENT;
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
