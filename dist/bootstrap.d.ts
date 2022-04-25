import {Algodv2} from "algosdk";
import {InitiatorSigner, SignerTransaction} from "./util/commonTypes";
import {PoolInfo} from "./util/pool/poolTypes";
export declare function getBootstrapProcessTxnCount(asset2ID: number): 4 | 5;
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
/**
 * Create an pool for an asset pair if it does not already exist. The initiator will provide
 * funding to create the pool and pay for the creation transaction fees.
 *
 * @param client An Algodv2 client.
 * @param pool Parameters of the pool to create.
 * @param pool.validatorAppID The ID of the Validator App for the network.
 * @param pool.asset1ID The ID of the first asset in the pool pair.
 * @param pool.asset2ID The ID of the second asset in the pool pair.
 * @param signedTxns Signed transactions
 * @param txnIDs Transaction IDs
 */
export declare function createPool(
  client: Algodv2,
  pool: {
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
  },
  signedTxns: Uint8Array[],
  txnIDs: string[]
): Promise<PoolInfo>;
