import {InitiatorSigner} from "./common-types";
export declare function doBootstrap({
  client,
  poolLogicSig,
  validatorAppID,
  asset1ID,
  asset2ID,
  asset1UnitName,
  asset2UnitName,
  initiatorAddr,
  initiatorSigner
}: {
  client: any;
  poolLogicSig: {
    addr: string;
    program: Uint8Array;
  };
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  asset1UnitName: string;
  asset2UnitName: string;
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<{
  liquidityTokenID: number;
}>;
