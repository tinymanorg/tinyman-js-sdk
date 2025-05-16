import {Algodv2} from "algosdk";

import {intToBytes, joinByteArrays} from "../util/util";

async function compileTeal(sourceCode: string, algod: Algodv2): Promise<Uint8Array> {
  const compiled = await algod.compile(sourceCode).do();

  return new Uint8Array(Buffer.from(compiled.result, "base64"));
}

// Fetch and compile the approval and clear programs
async function getCompiledPrograms(algod: Algodv2) {
  // TODO: Fetch the source code from github once they are public
  const approvalSourceResponse = await fetch(
    `${process.env.PUBLIC_URL}/contracts/order_approval.teal`
  );
  const clearSourceResponse = await fetch(
    `${process.env.PUBLIC_URL}/contracts/order_clear_state.teal`
  );

  const approvalSource = await approvalSourceResponse.text();
  const clearSource = await clearSourceResponse.text();

  const approvalProgram = await compileTeal(approvalSource, algod);
  const clearProgram = await compileTeal(clearSource, algod);

  return {approvalProgram, clearProgram};
}

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

export {
  compileTeal,
  computeSHA512,
  createPaddedByteArray,
  getCompiledPrograms,
  joinByteArrays
};
