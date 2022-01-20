import {Algodv2} from "algosdk";
import {InitiatorSigner, SignerTransaction} from "./common-types";
export declare function getBootstrapProcessTxnCount(asset2ID: number): 5 | 4;
export declare function calculatePoolBootstrapFundingTxnAmount(
  asset2ID: number,
  fees: {
    liquidityTokenCreateTxn: number;
    asset1OptinTxn: number;
    asset2OptinTxn: number;
    validatorAppCallTxn: number;
  }
): number;
export declare function generateBootstrapTransactions({
  client,
  validatorAppID,
  asset1ID,
  asset2ID,
  asset1UnitName,
  asset2UnitName,
  initiatorAddr
}: {
  client: Algodv2;
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  asset1UnitName: string;
  asset2UnitName: string;
  initiatorAddr: string;
}): Promise<SignerTransaction[]>;
export declare function signBootstrapTransactions({
  txGroup,
  initiatorSigner,
  validatorAppID,
  asset1ID,
  asset2ID
}: {
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
}): Promise<{
  signedTxns: Uint8Array[];
  txnIDs: string[];
}>;
export declare function doBootstrap({
  client,
  signedTxns,
  txnIDs
}: {
  client: Algodv2;
  signedTxns: Uint8Array[];
  txnIDs: string[];
}): Promise<{
  liquidityTokenID: number;
}>;
