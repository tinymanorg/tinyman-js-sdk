import { Algodv2 } from "algosdk";
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
    totalLockedAmount: bigint;
    totalPowerCount: bigint;
    tinyAssetId: number;
    lastTotalPowerTimestamp: number;
    constructor(tinyAssetId: bigint, totalLockedAmount: bigint, totalPowerCount: bigint, lastTotalPowerTimestamp: bigint);
    get freeTotalPowerSpaceCount(): number;
    get lastTotalPowerBoxIndex(): number;
    get lastTotalPowerArrayIndex(): number;
}
declare function getAccountState(algodClient: Algodv2, appId: number, address: string): Promise<AccountState | null>;
declare function getAccountStateBoxName(address: string): Uint8Array;
declare function getTotalPowerBoxName(boxIndex: number): Uint8Array;
declare function getLastAccountPowerBoxIndexes(powerCount: bigint): [number, number];
declare function getAccountPowerBoxName(address: string, boxIndex: number): Uint8Array;
declare function getSlopeChange(algod: Algodv2, appId: number, timeStamp: number): Promise<SlopeChange | null>;
declare function getSlopeChangeBoxName(timestamp: number): Uint8Array;
declare function getAllTotalPowers(algodClient: Algodv2, appId: number, totalPowerCount: bigint): Promise<TotalPower[]>;
declare function getAccountPowers({ algodClient, address, appId, powerCount }: {
    algodClient: Algodv2;
    address: string;
    appId: number;
    powerCount: number | null;
}): Promise<AccountPower[]>;
declare function getPowerIndexAt(powers: AccountPower[] | TotalPower[], timestamp: number): number | null;
export { AccountPower, AccountState, SlopeChange, TotalPower, VaultAppGlobalState, getAccountPowerBoxName, getAccountPowers, getAccountState, getAccountStateBoxName, getAllTotalPowers, getLastAccountPowerBoxIndexes, getPowerIndexAt, getSlopeChange, getSlopeChangeBoxName, getTotalPowerBoxName };
