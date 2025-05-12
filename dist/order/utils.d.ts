import { Algodv2 } from "algosdk";
import { StructDefinition } from "../util/client/base/types";
import { Struct } from "../util/client/base/utils";
import { PoolReserves } from "../util/pool/poolTypes";
declare function getStruct(name: string, structReference: Record<string, StructDefinition>): Struct;
declare function compileTeal(sourceCode: string, algod: Algodv2): Promise<Uint8Array>;
declare function getCompiledPrograms(algod: Algodv2): Promise<{
    approvalProgram: Uint8Array;
    clearProgram: Uint8Array;
}>;
declare function joinByteArrays(...arrays: Uint8Array[]): Uint8Array;
declare function createPaddedByteArray(elements: number[], length?: number, paddingValue?: number, byteSize?: number): Uint8Array;
export declare function getMinBalanceForAccount(accountInfo: any): bigint;
/**
 * Calculates the pair ratio for the pool reserves
 */
declare function getPoolPairRatio(reserves: null | Pick<PoolReserves, "asset1" | "asset2">): null | number;
declare function computeSHA512(fileArrayBuffer: Uint8Array): Promise<string>;
export { compileTeal, computeSHA512, createPaddedByteArray, getCompiledPrograms, getPoolPairRatio, getStruct, joinByteArrays };
