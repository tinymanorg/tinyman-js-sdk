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

export {createPaddedByteArray, getCompiledPrograms};
