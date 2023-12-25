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
export declare function parseState(kv: any): any;
