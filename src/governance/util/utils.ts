export function areBuffersEqual(buf1: Uint8Array, buf2: Uint8Array) {
  return Buffer.compare(buf1, buf2) === 0;
}

export function bytesToInt(buffer: Uint8Array): number {
  let num = 0n;

  for (let i = 0; i < buffer.byteLength; i++) {
    const byte = buffer[i];

    num *= BigInt(0x100);
    num += BigInt(byte);
  }

  return Number(num);
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/* eslint-enable no-bitwise */
