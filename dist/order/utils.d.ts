import { joinByteArrays } from "../util/util";
declare function createPaddedByteArray(elements: number[], length?: number, paddingValue?: number, byteSize?: number): Uint8Array;
declare function computeSHA512(fileArrayBuffer: Uint8Array): Promise<string>;
export { computeSHA512, createPaddedByteArray, joinByteArrays };
