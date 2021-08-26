import {Algodv2} from "algosdk";
import {InitiatorSigner, SignerTransaction} from "./common-types";
export declare function getBootstrapProcessTxnCount(asset2ID: number): 5 | 4;
export declare function generateBootstrapTransactions({
  client,
  poolLogicSig,
  validatorAppID,
  asset1ID,
  asset2ID,
  asset1UnitName,
  asset2UnitName,
  initiatorAddr
}: {
  client: Algodv2;
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
}): Promise<SignerTransaction[]>;
export declare function signBootstrapTransactions({
  poolLogicSig,
  txGroup,
  initiatorSigner
}: {
  poolLogicSig: {
    addr: string;
    program: Uint8Array;
  };
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<{
  signedTxns: Uint8Array[];
  txnIDs: string[];
}>;
export declare function doBootstrap({
  client,
  signedTxns,
  txnIDs
}: {
  client: any;
  signedTxns: Uint8Array[];
  txnIDs: string[];
}): Promise<{
  liquidityTokenID: number;
}>;
