import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { GetRawBoxValueCacheProps } from "../types";
declare class AccountState {
    lockedAmount: number;
    lockEndTime: number;
    powerCount: number;
    deletedPowerCount: number;
    constructor(lockedAmount: number, lockEndTime: number, powerCount: number, deletedPowerCount: number);
    get freeAccountPowerSpaceCount(): number;
    get lastAccountPowerBoxIndex(): number;
    get lastAccountPowerArrayIndex(): number;
}
declare class AccountPower {
    bias: number;
    timestamp: number;
    slope: number;
    cumulativePower: number;
    constructor(bias: number, timestamp: number, slope: number, cumulativePower: number);
    get lockEndTimestamp(): number;
    cumulativePowerAt(timestamp: number): number;
}
declare class TotalPower {
    bias: number;
    timestamp: number;
    slope: number;
    cumulativePower: number;
    constructor(bias: number, timestamp: number, slope: number, cumulativePower: number);
}
declare class SlopeChange {
    slopeDelta?: number;
    constructor(slopeDelta?: number);
}
declare class VaultAppGlobalState {
    tinyAssetId: number;
    totalLockedAmount: number;
    totalPowerCount: number;
    lastTotalPowerTimestamp: number;
    constructor(tinyAssetId: number, totalLockedAmount: number, totalPowerCount: number, lastTotalPowerTimestamp: number);
    get freeTotalPowerSpaceCount(): number;
    get lastTotalPowerBoxIndex(): number;
    get lastTotalPowerArrayIndex(): number;
}
declare function getAccountState(algodClient: AlgodClient, appId: number, address: string, cacheProps?: GetRawBoxValueCacheProps, shouldReadCacheFirst?: boolean): Promise<AccountState | null>;
declare function getAccountStateBoxName(address: string): Uint8Array;
declare function getTotalPowerBoxName(boxIndex: number): Uint8Array;
declare function getLastAccountPowerBoxIndexes(powerCount: number): [number, number];
declare function getAccountPowerBoxName(address: string, boxIndex: number): Uint8Array;
declare function getSlopeChange(algod: AlgodClient, appId: number, timeStamp: number, cacheProps?: GetRawBoxValueCacheProps, shouldReadCacheFirst?: boolean): Promise<SlopeChange | null>;
declare function getSlopeChangeBoxName(timestamp: number): Uint8Array;
declare function getAllTotalPowers(algodClient: AlgodClient, appId: number, totalPowerCount: number, cacheProps?: GetRawBoxValueCacheProps, shouldReadCacheFirst?: boolean): Promise<TotalPower[]>;
declare function getAccountPowers({ algodClient, address, appId, powerCount, cacheProps, shouldReadCacheFirst }: {
    algodClient: AlgodClient;
    address: string;
    appId: number;
    powerCount: number | null;
    cacheProps?: GetRawBoxValueCacheProps;
    shouldReadCacheFirst?: boolean;
}): Promise<AccountPower[]>;
declare function getPowerIndexAt(powers: AccountPower[] | TotalPower[], timestamp: number): number | null;
export { AccountState, AccountPower, TotalPower, VaultAppGlobalState, SlopeChange, getAccountState, getAccountPowers, getAccountPowerBoxName, getAccountStateBoxName, getLastAccountPowerBoxIndexes, getPowerIndexAt, getTotalPowerBoxName, getSlopeChangeBoxName, getSlopeChange, getAllTotalPowers };
