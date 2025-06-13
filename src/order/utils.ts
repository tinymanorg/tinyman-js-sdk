import {Algodv2, base64ToBytes} from "algosdk";

import {intToBytes, joinByteArrays} from "../util/util";

function createPaddedByteArray(
  elements: number[],
  length = 8,
  paddingValue = 0,
  byteSize = 8
) {
  const array = new Array(length).fill(paddingValue);

  array.splice(0, elements.length, ...elements);

  return joinByteArrays(...array.map((num) => intToBytes(num, byteSize)));
}

async function computeSHA512(fileArrayBuffer: Uint8Array) {
  const hashBuffer = await crypto.subtle.digest("SHA-512", fileArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Extract the first 32 bytes (256 bits)
  const sha512_256HashArray = hashArray.slice(0, 32);

  // Convert the byte array to a hexadecimal string
  const hashHex = Array.from(sha512_256HashArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

async function compileTeal(sourceCode: string, algod: Algodv2): Promise<Uint8Array> {
  const compiled = await algod.compile(sourceCode).do();

  return base64ToBytes(compiled.result);
}

// Fetch and compile the approval and clear programs
async function getCompiledPrograms(algod: Algodv2) {
  const approvalSourceResponse = await fetch(
    "https://raw.githubusercontent.com/tinymanorg/tinyman-order-protocol/main/contracts/order/build/order_approval.teal"
  );
  const clearSourceResponse = await fetch(
    "https://raw.githubusercontent.com/tinymanorg/tinyman-order-protocol/main/contracts/order/build/order_clear_state.teal"
  );

  const approvalSource = await approvalSourceResponse.text();
  const clearSource = await clearSourceResponse.text();

  const approvalProgram = await compileTeal(approvalSource, algod);
  const clearProgram = await compileTeal(clearSource, algod);

  return {approvalProgram, clearProgram};
}

export {computeSHA512, createPaddedByteArray, getCompiledPrograms, joinByteArrays};
