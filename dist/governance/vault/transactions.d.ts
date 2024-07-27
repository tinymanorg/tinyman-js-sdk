import algosdk, { SuggestedParams } from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { AccountState, SlopeChange, VaultAppGlobalState } from "./storage";
import { SupportedNetwork } from "../../util/commonTypes";
declare function prepareCreateLockTransactions({ accountState, lockEndTime, lockedAmount, network, sender, vaultAppGlobalState, suggestedParams, slopeChangeAtLockEndTime, appCallNote }: {
    network: SupportedNetwork;
    sender: string;
    lockedAmount: number;
    lockEndTime: number;
    vaultAppGlobalState: VaultAppGlobalState;
    suggestedParams: SuggestedParams;
    accountState?: AccountState | null;
    slopeChangeAtLockEndTime?: SlopeChange | null;
    appCallNote?: Uint8Array;
}): algosdk.Transaction[];
declare function prepareIncreaseLockAmountTransactions({ accountState, lockedAmount, network, sender, vaultAppGlobalState, suggestedParams, appCallNote }: {
    network: SupportedNetwork;
    sender: string;
    lockedAmount: number;
    vaultAppGlobalState: VaultAppGlobalState;
    accountState: AccountState;
    suggestedParams: SuggestedParams;
    appCallNote?: Uint8Array;
}): algosdk.Transaction[];
declare function prepareExtendLockEndTimeTransactions({ accountState, network, newLockEndTime, slopeChangeAtNewLockEndTime, sender, vaultAppGlobalState, suggestedParams, appCallNote }: {
    network: SupportedNetwork;
    sender: string;
    newLockEndTime: number;
    vaultAppGlobalState: VaultAppGlobalState;
    accountState: AccountState;
    slopeChangeAtNewLockEndTime?: number;
    suggestedParams: SuggestedParams;
    appCallNote?: Uint8Array;
}): algosdk.Transaction[];
declare function prepareWithdrawTransactions({ accountState, network, sender, suggestedParams, appCallNote }: {
    network: SupportedNetwork;
    client: AlgodClient;
    sender: string;
    accountState: AccountState;
    suggestedParams: SuggestedParams;
    appCallNote?: Uint8Array;
}): algosdk.Transaction[];
export { prepareCreateLockTransactions, prepareIncreaseLockAmountTransactions, prepareExtendLockEndTimeTransactions, prepareWithdrawTransactions };
