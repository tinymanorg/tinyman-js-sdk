import { Algodv2, Transaction } from "algosdk";
declare function getRawBoxValue(algod: Algodv2, appId: number, boxName: Uint8Array): Promise<Uint8Array | null>;
declare function doesBoxExist(algod: Algodv2, appId: number, boxName: Uint8Array): Promise<boolean>;
declare function getBias(slope: number, timeDelta: number): number;
/**
 * Calculates the tiny power at a given timestamp
 * @param lockAmount - amount of tokens locked
 * @param lockEndTime - timestamp of the end of the lock, in seconds
 * @param timeStamp - timestamp of the time to calculate the tiny power for, in seconds
 * @returns tiny power at the given timestamp
 */
declare function calculateTinyPower(lockAmount: number, lockEndTime: number, timeStamp?: number): number;
declare function getCumulativePowerDelta(bias: number, slope: number, timeDelta: number): number;
declare function getGlobalState(algod: Algodv2, appId: number): Promise<Record<string, any>>;
declare function generateCidFromProposalMetadata(metadata: Record<string, any>): Promise<string>;
declare function combineAndRegroupTxns(...txns: Transaction[][]): Transaction[];
declare function getAllBoxNames(algod: Algodv2, appId: number): Promise<Uint8Array[]>;
export { calculateTinyPower, combineAndRegroupTxns, doesBoxExist, generateCidFromProposalMetadata, getAllBoxNames, getBias, getCumulativePowerDelta, getGlobalState, getRawBoxValue };
