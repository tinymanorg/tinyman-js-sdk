import { joinByteArrays } from "../util/util";
declare function createPaddedByteArray(elements: number[], length?: number, paddingValue?: number, byteSize?: number): Uint8Array;
declare function computeSHA512(fileArrayBuffer: Uint8Array): Promise<string>;
declare function getCompiledPrograms(): Promise<{
    approvalProgram: Uint8Array;
    clearProgram: Uint8Array;
}>;
export { computeSHA512, createPaddedByteArray, getCompiledPrograms, joinByteArrays };
