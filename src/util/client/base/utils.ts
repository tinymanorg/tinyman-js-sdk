import {toByteArray} from "base64-js";

import {
  MINIMUM_BALANCE_REQUIREMENT_PER_BOX,
  MINIMUM_BALANCE_REQUIREMENT_PER_BOX_BYTE
} from "./constants";
import {StructDefinition} from "./types";

class Struct {
  private data: DataView | null = null;
  protected name: string;
  protected fields: Record<string, any>;
  private structReference: Record<string, StructDefinition>;
  size: number;

  constructor(name: string, structReference: Record<string, StructDefinition>) {
    this.name = name;
    this.structReference = structReference;
    this.size = structReference[name].size;
    this.fields = structReference[name].fields;
  }

  apply(data?: Buffer) {
    let rawData = data;

    if (!rawData) {
      rawData = Buffer.alloc(this.size);
    }

    this.data = new DataView(rawData.buffer, rawData.byteOffset, rawData.byteLength);

    return this;
  }

  getField(prop: string) {
    if (!this.data) {
      throw new Error("Data is not initialized");
    }

    const field = this.fields[prop];

    if (!field) {
      throw new Error(`Field ${prop} does not exist in struct ${this.name}`);
    }

    const start = field.offset;
    const end = field.offset + field.size;

    const value = this.data?.buffer.slice(start, end);
    const type = getType(field.type, this.structReference);

    return type.apply(Buffer.from(value));
  }
}

class ArrayData {
  private struct: Struct;
  private data: DataView | null = null;
  private length: number;

  constructor(struct: Struct, length: number) {
    this.struct = struct;
    this.length = length;
  }

  apply(data?: Buffer) {
    let rawData = data;

    if (!rawData) {
      rawData = Buffer.alloc(this.struct.size * this.length);
    }

    this.data = new DataView(rawData.buffer, rawData.byteOffset, rawData.byteLength);

    return this;
  }

  getField(index: number) {
    const offset = this.struct.size * index;
    const end = offset + this.struct.size;

    const value = this.data?.buffer.slice(offset, end);

    return this.struct.apply(value ? Buffer.from(value) : undefined);
  }
}

class TealistInt {
  apply(buffer: Buffer) {
    let value = BigInt(0);

    // Read bytes in big-endian order
    for (let i = 0; i < buffer.length; i++) {
      // eslint-disable-next-line no-bitwise
      value = (value << BigInt(8)) + BigInt(buffer[i]);
    }

    return value;
  }
}

class TealishBytes {
  apply(buffer: Buffer) {
    return buffer;
  }
}

function getType(
  name: string,
  structReference: Record<string, StructDefinition>
): Struct | ArrayData | TealistInt | TealishBytes {
  if (name === "int") {
    return new TealistInt();
  } else if (name.startsWith("uint")) {
    return new TealistInt();
  } else if (name.startsWith("bytes")) {
    return new TealishBytes();
  } else if (Object.keys(structReference).includes(name)) {
    return new Struct(name, structReference);
  } else if (name.includes("[")) {
    const regex = /^(\w+)\[(\d+)\]$/;

    const match = name.match(regex);

    if (!match) {
      throw new Error(`Could not parse array type: ${name}`);
    }

    const structName = match[1] as keyof typeof structReference;
    const length = parseInt(match[2], 10);

    return new ArrayData(new Struct(structName, structReference), Number(length));
  }

  throw new Error(`Unknown type: ${name}`);
}

function getBoxCosts(boxes: Record<string, Struct>) {
  return Object.entries(boxes).reduce((costs, [name, struct]) => {
    const total =
      costs +
      toByteArray(name).length * MINIMUM_BALANCE_REQUIREMENT_PER_BOX_BYTE +
      struct.size * MINIMUM_BALANCE_REQUIREMENT_PER_BOX_BYTE;

    return total;
  }, MINIMUM_BALANCE_REQUIREMENT_PER_BOX);
}

export {ArrayData, getBoxCosts, Struct};
