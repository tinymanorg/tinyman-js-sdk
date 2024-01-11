/**
 * Utility function for converting the Algorand key-value schema into a plain object.
 *
 * Algorand store keys in base64 encoding and store values as either bytes or unsigned integers depending
 * on the type. This function decodes this information into a more human friendly structure.
 *
 * @param kv Algorand key-value data structure to parse.
 *
 * @returns Key value dictionary parsed from the argument.
 */
export function parseState(kv: any) {
  // Transform algorand key-value schema.
  const res: any = {};

  for (const elem of kv) {
    const key = new TextDecoder().decode(Buffer.from(elem.key, "base64"));
    let val: string | number;

    if (elem.value.type === 1) {
      val = elem.value.bytes;
    } else {
      val = elem.value.uint;
    }
    res[key] = val;
  }
  return res;
}

export function mulScale(n1: bigint, n2: bigint, scale: bigint): bigint {
  return (n1 * n2) / scale;
}

export function divScale(n1: bigint, n2: bigint, scale: bigint): bigint {
  return (n1 * scale) / n2;
}
