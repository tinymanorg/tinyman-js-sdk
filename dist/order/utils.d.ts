import { Algodv2 } from "algosdk";
import { joinByteArrays } from "../util/util";
declare function compileTeal(sourceCode: string, algod: Algodv2): Promise<Uint8Array>;
declare function getCompiledPrograms(algod: Algodv2): Promise<{
    approvalProgram: Uint8Array;
    clearProgram: Uint8Array;
}>;
declare function createPaddedByteArray(elements: number[], length?: number, paddingValue?: number, byteSize?: number): Uint8Array;
declare function computeSHA512(fileArrayBuffer: Uint8Array): Promise<string>;
export { compileTeal, computeSHA512, createPaddedByteArray, getCompiledPrograms, joinByteArrays };
