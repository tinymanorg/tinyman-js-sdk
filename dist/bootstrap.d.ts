import {InitiatorSigner} from "./common-types";
export declare function doBootstrap({
  client,
  poolLogicSig,
  validatorAppID,
  asset1ID,
  asset2ID,
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
  initiatorAddr: string;
  initiatorSigner: InitiatorSigner;
}): Promise<{
  liquidityTokenID: number;
}>;
