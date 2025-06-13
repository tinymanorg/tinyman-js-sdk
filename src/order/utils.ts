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

// Fetch and compile the approval and clear programs
async function getCompiledPrograms() {
  const approvalSourceResponse = await fetch(
    "https://raw.githubusercontent.com/tinymanorg/tinyman-order-protocol/main/contracts/order/build/order_approval.teal.tok"
  );
  const clearSourceResponse = await fetch(
    "https://raw.githubusercontent.com/tinymanorg/tinyman-order-protocol/main/contracts/order/build/order_clear_state.teal.tok"
  );

  const approvalSourceResponseBuffer = await approvalSourceResponse.arrayBuffer();
  const approvalProgram = new Uint8Array(approvalSourceResponseBuffer);

  const clearSourceResponseBuffer = await clearSourceResponse.arrayBuffer();
  const clearProgram = new Uint8Array(clearSourceResponseBuffer);

  return {approvalProgram, clearProgram};
}

export {computeSHA512, createPaddedByteArray, getCompiledPrograms, joinByteArrays};
