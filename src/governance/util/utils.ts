/* eslint-disable no-bitwise */
export function intToBytes(num: number, length = 8): Uint8Array {
  const byteArray = new Uint8Array(length);
  let newNum = num;

  for (let i = length - 1; i >= 0; i--) {
    byteArray[i] = newNum & 0xff;
    newNum >>= 8;
  }

  return byteArray;
}

export function areBuffersEqual(buf1: Uint8Array, buf2: Uint8Array) {
  return Buffer.compare(buf1, buf2) === 0;
}

export function bytesToInt(buffer: Uint8Array): number {
  let num = 0;

  for (let i = 0; i < buffer.byteLength; i++) {
    const byte = buffer[i];

    num *= 0x100;
    num += byte;
  }

  return num;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/* eslint-enable no-bitwise */
