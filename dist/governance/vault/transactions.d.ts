import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { AccountState, SlopeChange, VaultAppGlobalState } from "./storage";
import { SupportedNetwork } from "../../util/commonTypes";
declare function prepareCreateLockTransactions({ accountState, lockEndTime, lockedAmount, network, sender, vaultAppGlobalState, slopeChangeAtLockEndTime, client, appCallNote }: {
    network: SupportedNetwork;
    sender: string;
    lockedAmount: number;
    lockEndTime: number;
    client: AlgodClient;
    vaultAppGlobalState: VaultAppGlobalState;
    accountState?: AccountState | null;
    slopeChangeAtLockEndTime?: SlopeChange | null;
    appCallNote?: Uint8Array;
}): Promise<algosdk.Transaction[]>;
declare function prepareIncreaseLockAmountTransactions({ accountState, lockedAmount, network, sender, vaultAppGlobalState, client, appCallNote }: {
    network: SupportedNetwork;
    client: AlgodClient;
    sender: string;
    lockedAmount: number;
    vaultAppGlobalState: VaultAppGlobalState;
    accountState: AccountState;
    appCallNote?: Uint8Array;
}): Promise<algosdk.Transaction[]>;
declare function prepareExtendLockEndTimeTransactions({ accountState, client, network, newLockEndTime, slopeChangeAtNewLockEndTime, sender, vaultAppGlobalState, appCallNote }: {
    network: SupportedNetwork;
    sender: string;
    newLockEndTime: number;
    vaultAppGlobalState: VaultAppGlobalState;
    accountState: AccountState;
    slopeChangeAtNewLockEndTime?: number;
    client: AlgodClient;
    appCallNote?: Uint8Array;
}): Promise<algosdk.Transaction[]>;
declare function prepareWithdrawTransactions({ accountState, network, sender, client, appCallNote }: {
    network: SupportedNetwork;
    client: AlgodClient;
    sender: string;
    accountState: AccountState;
    appCallNote?: Uint8Array;
}): Promise<algosdk.Transaction[]>;
export { prepareCreateLockTransactions, prepareIncreaseLockAmountTransactions, prepareExtendLockEndTimeTransactions, prepareWithdrawTransactions };
