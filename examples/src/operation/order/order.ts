import {
  InitiatorSigner,
  OrderingClient,
  OrderType,
  PutRecurringOrderParams,
  PutTriggerOrderParams,
  sendAndWaitRawTransaction,
  SupportedNetwork
} from "@tinymanorg/tinyman-js-sdk";

import {algodClient} from "../../util/client";

export function initializeOrderingClient(
  selectedAccountAddress: string,
  network: SupportedNetwork
) {
  return OrderingClient.initializeOrderingClient(
    algodClient,
    network,
    selectedAccountAddress
  );
}

export async function createOrderApplication(
  orderingClient: OrderingClient,
  selectedAccountAddress: string,
  initiatorSigner: InitiatorSigner,
  network: SupportedNetwork
) {
  try {
    const createOrderTxns = await orderingClient.prepareCreateOrderAppTransactions(
      selectedAccountAddress
    );

    const signedTxns = await initiatorSigner([
      orderingClient.convertStandardTransactionsToSignerTransactions(
        createOrderTxns,
        selectedAccountAddress
      )
    ]);

    const response = await sendAndWaitRawTransaction(algodClient, [signedTxns]);

    // Once the order app is created re-instantiate the OrderingClient to set the app id
    await initializeOrderingClient(selectedAccountAddress, network);
    return response;
  } catch (error: any) {
    return Promise.reject(new Error(error?.message));
  }
}

export async function updateOrderApplicationIfNecessary(
  orderingClient: OrderingClient,
  selectedAccountAddress: string,
  initiatorSigner: InitiatorSigner
) {
  try {
    const shouldUpdateOrderApp = await orderingClient.shouldUpdateOrderingApp();

    if (!shouldUpdateOrderApp) {
      return;
    }

    const txns = await orderingClient.prepareUpdateOrderingAppTransactions();

    const signedTxns = await initiatorSigner([
      orderingClient.convertStandardTransactionsToSignerTransactions(
        txns,
        selectedAccountAddress
      )
    ]);

    await sendAndWaitRawTransaction(algodClient, [signedTxns]);

    console.log("Order app updated successfully");
  } catch (error: any) {
    console.log(error.message);
  }
}

export async function placeTriggerOrder(
  orderParams: PutTriggerOrderParams,
  orderingClient: OrderingClient,
  selectedAccountAddress: string,
  initiatorSigner: InitiatorSigner
) {
  try {
    const txns = await orderingClient.preparePutTriggerOrderTransactions(orderParams);

    const signedTxns = await initiatorSigner([
      orderingClient.convertStandardTransactionsToSignerTransactions(
        txns,
        selectedAccountAddress
      )
    ]);

    const response = await sendAndWaitRawTransaction(algodClient, [signedTxns]);

    return response;
  } catch (error: any) {
    return Promise.reject(new Error(error?.message));
  }
}

export async function placeRecurringOrder(
  orderParams: PutRecurringOrderParams,
  orderingClient: OrderingClient,
  selectedAccountAddress: string,
  initiatorSigner: InitiatorSigner
) {
  try {
    const txns = await orderingClient.preparePutRecurringOrderTransactions(orderParams);

    const signedTxns = await initiatorSigner([
      orderingClient.convertStandardTransactionsToSignerTransactions(
        txns,
        selectedAccountAddress
      )
    ]);

    const response = await sendAndWaitRawTransaction(algodClient, [signedTxns]);

    return response;
  } catch (error: any) {
    return Promise.reject(new Error(error?.message));
  }
}

export async function claimPartialOrder(
  orderingClient: OrderingClient,
  selectedAccountAddress: string,
  initiatorSigner: InitiatorSigner,
  orderId: number,
  type: OrderType
) {
  try {
    const txns = await orderingClient.prepareClaimCollectedTargetAmount(orderId, type);

    const signedTxns = await initiatorSigner([
      orderingClient.convertStandardTransactionsToSignerTransactions(
        txns,
        selectedAccountAddress
      )
    ]);

    const res = await sendAndWaitRawTransaction(algodClient, [signedTxns]);

    return Promise.resolve(res);
  } catch (error: any) {
    return Promise.reject(error.message);
  }
}

export async function cancelOrder(
  orderingClient: OrderingClient,
  selectedAccountAddress: string,
  initiatorSigner: InitiatorSigner,
  orderId: number,
  type: OrderType
) {
  try {
    const txns = await orderingClient.prepareCancelOrderTransactions(orderId, type);

    const signedTxns = await initiatorSigner([
      orderingClient.convertStandardTransactionsToSignerTransactions(
        txns,
        selectedAccountAddress
      )
    ]);

    const response = await sendAndWaitRawTransaction(algodClient, [signedTxns]);

    return response;
  } catch (error: any) {
    return Promise.reject(new Error(error?.message));
  }
}
