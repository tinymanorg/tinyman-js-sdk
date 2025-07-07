declare function createPaddedByteArray(elements: number[], length?: number, paddingValue?: number, byteSize?: number): Uint8Array;
declare function getCompiledPrograms(): Promise<{
    approvalProgram: Uint8Array;
    clearProgram: Uint8Array;
}>;
export { createPaddedByteArray, getCompiledPrograms };
