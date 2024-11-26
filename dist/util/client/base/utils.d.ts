/// <reference types="node" />
import { StructDefinition } from "./types";
declare class Struct {
    private data;
    protected name: string;
    protected fields: Record<string, any>;
    private structReference;
    size: number;
    constructor(name: string, structReference: Record<string, StructDefinition>);
    apply(data?: Buffer): this;
    getField(prop: string): bigint | Buffer | Struct | ArrayData;
}
declare class ArrayData {
    private struct;
    private data;
    private length;
    constructor(struct: Struct, length: number);
    apply(data?: Buffer): this;
    getField(index: number): Struct;
}
declare function getBoxCosts(boxes: Record<string, Struct>): number;
declare function getStruct(name: string, structReference: Record<string, StructDefinition>): Struct;
export { ArrayData, getBoxCosts, Struct, getStruct };
