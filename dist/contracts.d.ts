export declare const validatorApprovalContract: Uint8Array;
export declare const validatorClearStateContract: Uint8Array;
export declare const VALIDATOR_APP_SCHEMA: {
  numLocalInts: number;
  numLocalByteSlices: number;
  numGlobalInts: number;
  numGlobalByteSlices: number;
};
export declare function encodeVarInt(number: any): number[];
export declare function getPoolLogicSig({
  validatorAppID,
  asset1ID,
  asset2ID
}: {
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
}): {
  addr: string;
  program: Uint8Array;
};
