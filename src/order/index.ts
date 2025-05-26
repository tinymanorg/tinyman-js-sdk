import algosdk, {
  Algodv2,
  base64ToBytes,
  bigIntToBytes,
  bytesToBase64,
  decodeAddress,
  getApplicationAddress,
  Transaction
} from "algosdk";

import {
  APP_VERSION_KEY,
  APPROVAL_PROGRAM,
  CLEAR_PROGRAM,
  GOVERNOR_ORDER_FEE_RATE_KEY,
  MINIMUM_PUT_ORDER_TRANSACTION_COUNT,
  ORDER_APP_EXTRA_PAGES,
  ORDER_APP_GLOBAL_SCHEMA,
  ORDER_APP_LOCAL_SCHEMA,
  ORDER_FEE_RATE_KEY,
  REGISTRY_APP_ID,
  ROUTER_APP_ID,
  REGISTRY_STRUCT,
  ORDER_STRUCTS,
  TOTAL_ORDER_COUNT_KEY,
  VAULT_APP_ID,
  APP_LATEST_VERSION_KEY
} from "./constants";
import {
  OrderType,
  PutTriggerOrderParams,
  PutRecurringOrderParams,
  OrderStruct
} from "./types";
import {createPaddedByteArray, joinByteArrays} from "./utils";
import {SupportedNetwork} from "../util/commonTypes";
import {encodeString, intToBytes} from "../util/util";
import {
  MINIMUM_BALANCE_REQUIRED_PER_APP,
  MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA,
  MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE
} from "../util/constant";
import {Struct} from "../util/client/base/utils";
import {ALGO_ASSET_ID} from "../util/asset/assetConstants";
import TinymanBaseClient from "../util/client/base/baseClient";
import {isAlgo} from "../util/asset/assetUtils";

const ENTRY_STRUCT = new Struct("Entry", REGISTRY_STRUCT);
const TRIGGER_STRUCT = new Struct(OrderStruct.Trigger, ORDER_STRUCTS);
const RECURRING_STRUCT = new Struct(OrderStruct.Recurring, ORDER_STRUCTS);

class OrderingClient extends TinymanBaseClient<number | null, algosdk.Address | null> {
  registryAppId: number;
  registryApplicationAddress: string;
  vaultAppId: number;
  vaultApplicationAddress: string;
  routerAppId: number;
  routerApplicationAddress: string;
  userAddress: string;

  private constructor(
    algod: Algodv2,
    orderAppId: number | null,
    network: SupportedNetwork,
    userAddress: string
  ) {
    super(algod, orderAppId, network, REGISTRY_STRUCT);

    this.algod = algod;
    this.registryAppId = REGISTRY_APP_ID[network];
    this.registryApplicationAddress = getApplicationAddress(
      this.registryAppId
    ).toString();
    this.routerAppId = ROUTER_APP_ID[network];
    this.routerApplicationAddress = getApplicationAddress(this.routerAppId).toString();
    this.vaultAppId = VAULT_APP_ID[network];
    this.vaultApplicationAddress = getApplicationAddress(this.vaultAppId).toString();
    this.userAddress = userAddress;
  }

  private static getRegistryEntryBoxName(userAddress: string): Uint8Array {
    const decodedAddress = decodeAddress(userAddress).publicKey;

    return new Uint8Array([...encodeString("e"), ...decodedAddress]);
  }

  private static async getOrderApplicationId(
    algod: Algodv2,
    network: SupportedNetwork,
    userAddress: string
  ) {
    const boxName = OrderingClient.getRegistryEntryBoxName(userAddress);

    const registryAppId = REGISTRY_APP_ID[network];

    let boxValue: Buffer | null = null;

    try {
      const appBox = await algod.getApplicationBoxByName(registryAppId, boxName).do();

      boxValue = Buffer.from(appBox.value);
    } catch (error: any) {
      // Ignore the error if the box is not found
    }

    return boxValue ? (ENTRY_STRUCT.apply(boxValue).getField("app_id") as bigint) : null;
  }

  /**
   *  Initializes the OrderingClient by fetching the personal app id from global state.
   *  Until the user creates an application, the app id will be set as null
   */
  static async initializeOrderingClient(
    algod: Algodv2,
    network: SupportedNetwork,
    userAddress: string
  ) {
    const orderApplicationId = await OrderingClient.getOrderApplicationId(
      algod,
      network,
      userAddress
    );

    return new OrderingClient(
      algod,
      orderApplicationId ? Number(orderApplicationId) : null,
      network,
      userAddress
    );
  }

  /**
   * Compares the contracts between the user's order app and the latest available contract.
   *
   * @returns A boolean indicating if the order app needs to be updated.
   */
  async shouldUpdateOrderingApp(): Promise<boolean> {
    if (!this.appId) {
      return Promise.resolve(false);
    }

    const latestVersion = await this.getLatestOrderAppVersion();

    if (!latestVersion) {
      throw new Error("Registry app has no approved version. Unable to compare.");
    }

    const currentVersion = (await this.getGlobal(
      APP_VERSION_KEY,
      undefined,
      this.appId
    )) as bigint | undefined;

    return latestVersion !== currentVersion;
  }

  /**
   * Prepares transactions to update the ordering app using the latest contracts.
   * @returns A promise that resolves the transaction array.
   */
  // TODO: Once the contracts are public, use getCompiledPrograms for approval and clear programs
  async prepareUpdateOrderingAppTransactions(): Promise<Transaction[]> {
    if (!this.appId) {
      throw new Error("Application ID not provided");
    }

    const version = await this.getLatestOrderAppVersion();

    if (!version) {
      throw new Error(
        "Registry app has no approved version. Unable to update order app."
      );
    }

    const suggestedParams = await this.getSuggestedParams();

    const transactions = [
      algosdk.makeApplicationUpdateTxnFromObject({
        sender: this.userAddress,
        suggestedParams,
        appIndex: this.appId,
        appArgs: [encodeString("update_application"), bigIntToBytes(version, 8)],
        approvalProgram: base64ToBytes(APPROVAL_PROGRAM),
        clearProgram: base64ToBytes(CLEAR_PROGRAM)
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.userAddress,
        suggestedParams,
        appIndex: this.registryAppId,
        appArgs: [encodeString("verify_update"), bigIntToBytes(version, 8)],
        boxes: [
          {appIndex: this.registryAppId, name: this.getAppVersionBoxName(Number(version))}
        ]
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.userAddress,
        suggestedParams,
        appIndex: this.appId,
        appArgs: [encodeString("post_update")]
      })
    ];

    return this.setupTxnFeeAndAssignGroupId({txns: transactions});
  }

  calculateCreateOrderAppMinBalanceIncreaseAmount() {
    return (
      MINIMUM_BALANCE_REQUIRED_PER_APP * BigInt(1 + ORDER_APP_EXTRA_PAGES) +
      BigInt(ORDER_APP_GLOBAL_SCHEMA.numByteSlice) *
        MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA +
      BigInt(ORDER_APP_GLOBAL_SCHEMA.numUint) *
        MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE
    );
  }

  /**
   * Prepares transactions to create the order app for a user.
   * @param userAddress - The address of the user.
   * @returns A promise that resolves the transaction array.
   */
  async prepareCreateOrderAppTransactions(userAddress: string) {
    const version = await this.getLatestOrderAppVersion();

    if (!version) {
      throw new Error(
        "Registry app has no approved version. Unable to create order app."
      );
    }

    const sp = await this.getSuggestedParams();

    const entryBoxName = OrderingClient.getRegistryEntryBoxName(userAddress);

    let newBoxes: Record<string, Struct> = {};

    const transactions: Transaction[] = [];

    if (!(await this.boxExists(entryBoxName, this.registryAppId))) {
      newBoxes = {[bytesToBase64(entryBoxName)]: ENTRY_STRUCT};

      transactions.push(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: userAddress,
          receiver: this.registryApplicationAddress,
          amount: this.calculateMinBalance({accounts: 1, assets: 1, boxes: newBoxes}),
          suggestedParams: sp
        })
      );
    }

    transactions.push(
      algosdk.makeApplicationCreateTxnFromObject({
        sender: userAddress,
        suggestedParams: sp,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [encodeString("create_application"), intToBytes(this.registryAppId)],
        approvalProgram: base64ToBytes(APPROVAL_PROGRAM),
        clearProgram: base64ToBytes(CLEAR_PROGRAM),
        numGlobalByteSlices: ORDER_APP_GLOBAL_SCHEMA.numByteSlice,
        numGlobalInts: ORDER_APP_GLOBAL_SCHEMA.numUint,
        numLocalByteSlices: ORDER_APP_LOCAL_SCHEMA.numByteSlice,
        numLocalInts: ORDER_APP_LOCAL_SCHEMA.numUint,
        extraPages: ORDER_APP_EXTRA_PAGES
      }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: userAddress,
        suggestedParams: sp,
        appIndex: this.registryAppId,
        appArgs: [encodeString("create_entry")],
        boxes: [
          {appIndex: 0, name: entryBoxName},
          {
            appIndex: this.registryAppId,
            name: this.getAppVersionBoxName(Number(version))
          }
        ]
      })
    );

    return this.setupTxnFeeAndAssignGroupId({txns: transactions});
  }

  async checkOrderAppAvailability(orderAppId?: number) {
    if (!this.appId && !this.applicationAddress) {
      if (orderAppId) {
        this.appId = orderAppId;
        this.applicationAddress = getApplicationAddress(orderAppId);
      } else {
        const applicationId = await OrderingClient.getOrderApplicationId(
          this.algod,
          this.network,
          this.userAddress
        );

        if (applicationId) {
          this.appId = Number(applicationId);
          this.applicationAddress = getApplicationAddress(this.appId);
        } else {
          throw new Error(
            "Ordering client is not found for this account address. Please create an order app first."
          );
        }
      }
    }
  }

  async getPutTriggerOrderTransactionFee({
    assetInId,
    assetOutId,
    type
  }: {
    assetInId: number;
    assetOutId: number;
    type: OrderType;
  }) {
    let totalFee = 0n;

    // If the application ID is not set yet, ignore the fee calculation
    if (!this.applicationAddress) {
      return totalFee;
    }

    try {
      const suggestedMinFee = (await this.getSuggestedParams()).minFee;
      const assetsToOptin = await this.getAssetsToOptInToOrderingClient(
        this.applicationAddress,
        [assetInId, assetOutId]
      );

      const newOrderId = await this.getOrderCount();
      const orderBoxName = this.getOrderBoxName(newOrderId, type);

      // We can assume that the order box is not created with a new order id yet.
      const newBoxes: Record<string, Struct> = {
        [bytesToBase64(orderBoxName)]: TRIGGER_STRUCT
      };

      totalFee +=
        BigInt(
          MINIMUM_PUT_ORDER_TRANSACTION_COUNT +
            assetsToOptin.length +
            Number(Boolean(assetsToOptin.length))
        ) *
          suggestedMinFee +
        BigInt(
          this.calculateMinBalance({
            boxes: newBoxes,
            assets: assetsToOptin.length
          })
        );
    } catch (error: any) {
      // Ignore errors
    }

    return totalFee;
  }

  /**
   * Prepares an array of transactions to place a limit order.
   *
   * @param {PutTriggerOrderParams} params - The parameters for the put order operation.
   * @param params.assetInId - The ID of the input asset.
   * @param params.assetOutId - The ID of the output asset.
   * @param params.assetInAmount - The amount of the input asset in base units.
   * @param params.assetOutAmount - The amount of the output asset in base units.
   * @param params.isPartialAllowed - Whether partial fills are allowed.
   * @param params.duration - The duration of the order in seconds.
   * @param [params.orderAppId] - (Optional) The application ID for the order.
   * @returns A promise that resolves the transaction array.
   */
  async preparePutTriggerOrderTransactions({
    assetInId,
    assetOutId,
    assetInAmount,
    assetOutAmount,
    isPartialAllowed,
    duration
  }: PutTriggerOrderParams) {
    await this.checkOrderAppAvailability();

    const sp = await this.getSuggestedParams();
    const newOrderId = await this.getOrderCount();

    const orderBoxName = this.getOrderBoxName(newOrderId, OrderType.Trigger);
    let newBoxes: Record<string, Struct> = {};
    const transactions: Transaction[] = [];

    const assetsToOptin = await this.getAssetsToOptInToOrderingClient(
      this.applicationAddress!,
      [assetInId, assetOutId]
    );

    if (!(await this.boxExists(orderBoxName))) {
      newBoxes = {
        ...newBoxes,
        [bytesToBase64(orderBoxName)]: TRIGGER_STRUCT
      };

      const accountInfo = await this.algod
        .accountInformation(this.applicationAddress!)
        .do();

      const requiredAmountToCoverMinBalance = Math.max(
        0,
        Number(accountInfo.minBalance - accountInfo.amount)
      );

      transactions.push(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.userAddress,
          receiver: this.applicationAddress!,
          amount:
            requiredAmountToCoverMinBalance +
            this.calculateMinBalance({
              boxes: newBoxes,
              assets: assetsToOptin.length
            }),
          suggestedParams: sp
        })
      );
    }

    transactions.push(
      ...this.prepareOrderAppAssetOptinTransactionsIfNeeded(assetsToOptin, sp),
      assetInId === ALGO_ASSET_ID
        ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: this.userAddress,
            receiver: this.applicationAddress!,
            amount: assetInAmount,
            suggestedParams: sp
          })
        : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: this.userAddress,
            receiver: this.applicationAddress!,
            assetIndex: assetInId,
            amount: assetInAmount,
            suggestedParams: sp
          }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.userAddress,
        suggestedParams: sp,
        appIndex: this.appId!,
        appArgs: [
          encodeString("put_trigger_order"),
          intToBytes(assetInId),
          bigIntToBytes(assetInAmount, 8),
          intToBytes(assetOutId),
          bigIntToBytes(assetOutAmount, 8),
          intToBytes(Number(isPartialAllowed)),
          intToBytes(duration)
        ],
        foreignAssets: [assetOutId],
        foreignApps: [this.registryAppId, this.vaultAppId],
        boxes: [
          {appIndex: 0, name: orderBoxName},
          {appIndex: this.vaultAppId, name: decodeAddress(this.userAddress).publicKey},
          {
            appIndex: this.registryAppId,
            name: this.getRegistryEntryBoxName(this.userAddress)
          }
        ]
      })
    );

    return this.setupTxnFeeAndAssignGroupId({
      txns: transactions,
      additionalFeeCount: 2 + assetsToOptin.length
    });
  }

  /**
   * Prepares an array of transactions to place a recurring order.
   *
   * @param {PutRecurringOrderParams} params - The parameters for the recurring order.
   * @param params.amount - The amount per order to be used for the recurring order.
   * @param params.assetId - The ID of the asset being used for the order.
   * @param params.targetAssetId - The ID of the target asset for the order.
   * @param params.targetRecurrence - The number of times the order should recur.
   * @param params.interval - The interval between each recurrence in seconds.
   * @param params.maxTargetPrice - (Optional) The maximum price per unit of the target asset to be accepted.
   * @param params.minTargetPrice - (Optional) The minimum price per unit of the target asset to be accepted.
   * @returns A promise that resolves the transaction array.
   */
  async preparePutRecurringOrderTransactions({
    amount,
    assetId,
    targetAssetId,
    targetRecurrence,
    interval,
    maxTargetPrice,
    minTargetPrice
  }: PutRecurringOrderParams) {
    await this.checkOrderAppAvailability();

    const orderId = await this.getOrderCount();
    const orderBoxName = this.getOrderBoxName(orderId, OrderType.Recurring);
    const transactions: Transaction[] = [];
    let newBoxes: Record<string, Struct> = {};
    const suggestedParams = await this.getSuggestedParams();
    const assetsToOptin = await this.getAssetsToOptInToOrderingClient(
      this.applicationAddress!,
      [assetId, targetAssetId]
    );
    const totalAmount = amount * BigInt(targetRecurrence);

    if (!(await this.boxExists(orderBoxName))) {
      newBoxes = {
        ...newBoxes,
        [bytesToBase64(orderBoxName)]: RECURRING_STRUCT
      };

      const accountInfo = await this.algod
        .accountInformation(this.applicationAddress!)
        .do();

      const requiredAmountToCoverMinBalance = Math.max(
        0,
        Number(accountInfo.minBalance - BigInt(accountInfo.amount))
      );

      transactions.push(
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: this.userAddress,
          receiver: this.applicationAddress!,
          amount:
            requiredAmountToCoverMinBalance +
            this.calculateMinBalance({
              boxes: newBoxes,
              assets: assetsToOptin.length
            }),
          suggestedParams
        })
      );
    }

    transactions.push(
      ...this.prepareOrderAppAssetOptinTransactionsIfNeeded(
        assetsToOptin,
        suggestedParams
      ),
      assetId === ALGO_ASSET_ID
        ? algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: this.userAddress,
            receiver: this.applicationAddress!,
            amount: totalAmount,
            suggestedParams
          })
        : algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: this.userAddress,
            receiver: this.applicationAddress!,
            assetIndex: assetId,
            amount: totalAmount,
            suggestedParams
          }),
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.userAddress,
        suggestedParams,
        appIndex: this.appId!,
        foreignApps: [this.registryAppId, this.vaultAppId],
        foreignAssets: [targetAssetId],
        boxes: [
          {appIndex: 0, name: orderBoxName},
          {appIndex: this.vaultAppId, name: decodeAddress(this.userAddress).publicKey},
          {
            appIndex: this.registryAppId,
            name: this.getRegistryEntryBoxName(this.userAddress)
          }
        ],
        appArgs: [
          encodeString("put_recurring_order"),
          intToBytes(assetId),
          bigIntToBytes(amount, 8),
          intToBytes(targetAssetId),
          // Min received target amount per order
          intToBytes(maxTargetPrice ? Math.floor(Number(amount) / maxTargetPrice) : 0),
          // Max received target amount per order
          intToBytes(minTargetPrice ? Math.floor(Number(amount) / minTargetPrice) : 0),
          intToBytes(targetRecurrence),
          intToBytes(interval)
        ]
      })
    );

    return this.setupTxnFeeAndAssignGroupId({
      txns: transactions,
      additionalFeeCount: 2 + assetsToOptin.length
    });
  }

  /**
   * Prepares an array of transactions to cancel an order.
   *
   * @param orderId - The ID of the order to cancel.
   * @param type - The type of the order to cancel.
   * @returns A promise that resolves the transaction array.
   */
  async prepareCancelOrderTransactions(orderId: number, type: OrderType) {
    if (!this.appId) {
      throw new Error("Application ID not provided");
    }

    const orderBoxName = this.getOrderBoxName(orderId, type);

    const order = await this.getBox(
      orderBoxName,
      type === OrderType.Trigger ? OrderStruct.Trigger : OrderStruct.Recurring,
      this.appId,
      ORDER_STRUCTS
    );

    if (!order) {
      throw new Error("Order not found");
    }

    const sp = await this.getSuggestedParams();
    const transactions = [
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.userAddress,
        suggestedParams: sp,
        appIndex: this.appId,
        appArgs: [
          encodeString(
            type === OrderType.Trigger ? "cancel_trigger_order" : "cancel_recurring_order"
          ),
          intToBytes(orderId)
        ],
        boxes: [
          {appIndex: 0, name: orderBoxName},
          {
            appIndex: this.registryAppId,
            name: this.getRegistryEntryBoxName(this.userAddress)
          }
        ],
        foreignAssets: [Number(order.getField("asset_id"))],
        foreignApps: [this.registryAppId]
      })
    ];

    return this.setupTxnFeeAndAssignGroupId({txns: transactions, additionalFeeCount: 2});
  }

  /**
   * Prepares an array of transactions to claim the collected target amount for an order.
   * @param orderId - The ID of the order for which to claim the collected target amount.
   * @param type - The type of the order (OrderType.Trigger or OrderType.Recurring).
   * @returns A promise that resolves the transaction array.
   */
  async prepareClaimCollectedTargetAmount(orderId: number, type: OrderType) {
    if (!this.appId) {
      throw new Error("Application ID not provided");
    }

    const sp = await this.getSuggestedParams();

    const orderBoxName = this.getOrderBoxName(orderId, type);
    const order = await this.getBox(
      orderBoxName,
      type === OrderType.Trigger ? OrderStruct.Trigger : OrderStruct.Recurring
    );

    if (!order) {
      throw new Error("Order not found");
    }

    const txns = [
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: this.userAddress,
        suggestedParams: sp,
        appIndex: this.appId,
        appArgs: [
          encodeString("collect"),
          intToBytes(orderId),
          encodeString(type === OrderType.Trigger ? "o" : "r")
        ],
        boxes: [{appIndex: 0, name: orderBoxName}],
        foreignAssets: [Number(order.getField("target_asset_id") as bigint)],
        foreignApps: [this.registryAppId]
      })
    ];

    return this.setupTxnFeeAndAssignGroupId({txns, additionalFeeCount: 2});
  }

  /**
   * Gets the platform fee rate based on the provided tiny power from the global state.
   *
   * @param tinyPower - The tiny power to check against the threshold.
   * @returns The platform fee rate.
   */
  async getPlatformFeeRate(tinyPower: number | null): Promise<number> {
    const thresholdTinyPower = await this.getGlobal(
      TOTAL_ORDER_COUNT_KEY,
      0,
      this.registryAppId
    );

    if (tinyPower && tinyPower >= thresholdTinyPower) {
      return this.getGlobal(GOVERNOR_ORDER_FEE_RATE_KEY, 0, this.registryAppId);
    }

    return this.getGlobal(ORDER_FEE_RATE_KEY, 0, this.registryAppId);
  }

  private getOrderCount(): Promise<number> {
    return this.appId
      ? this.getGlobal(TOTAL_ORDER_COUNT_KEY, 0, this.appId)
      : Promise.resolve(0);
  }

  private getOrderBoxName(id: number, type: OrderType) {
    const orderPrefix = encodeString(type === OrderType.Trigger ? "o" : "r");
    const orderIdBytes = intToBytes(id);

    return joinByteArrays(orderPrefix, orderIdBytes);
  }

  private getRegistryEntryBoxName(userAddress: string) {
    return joinByteArrays(encodeString("e"), decodeAddress(userAddress).publicKey);
  }

  private prepareOrderAppAssetOptInTransaction(
    userAddress: string,
    appId: number,
    assetIds: number[],
    suggestedParams: algosdk.SuggestedParams
  ) {
    return algosdk.makeApplicationNoOpTxnFromObject({
      sender: userAddress,
      appIndex: appId,
      appArgs: [encodeString("asset_opt_in"), createPaddedByteArray(assetIds)],
      suggestedParams
    });
  }

  private prepareOrderAppAssetOptinTransactionsIfNeeded(
    assetIds: number[],
    suggestedParams: algosdk.SuggestedParams
  ) {
    if (!this.appId || !this.applicationAddress) {
      throw new Error("Application ID not provided");
    }

    if (!assetIds.length) {
      return [];
    }

    return [
      this.prepareOrderAppAssetOptInTransaction(
        this.userAddress,
        this.appId,
        assetIds,
        suggestedParams
      )
    ];
  }

  private async getAssetsToOptInToOrderingClient(
    appId: string | algosdk.Address,
    assetIds: number[]
  ) {
    const assetsToOptin: number[] = [];

    for (const asset of assetIds) {
      const shouldOptIn = isAlgo(asset) ? false : !(await this.isOptedIn(appId, asset));

      if (shouldOptIn) {
        assetsToOptin.push(asset);
      }
    }

    return assetsToOptin;
  }

  private getLatestOrderAppVersion(): Promise<bigint | undefined> {
    return this.getGlobal(APP_LATEST_VERSION_KEY, undefined, this.registryAppId);
  }

  private getAppVersionBoxName(version: number) {
    return joinByteArrays(encodeString("v"), intToBytes(version));
  }
}

export {OrderingClient};
