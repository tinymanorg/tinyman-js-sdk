import {Algodv2} from "algosdk";
import {PoolInfo} from "./pool";
import {
  TinymanAnalyticsApiAsset,
  InitiatorSigner,
  SignerTransaction
} from "./common-types";
/**
 * Execute a redeem operation to collect excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or liquidityTokenID.
 * @param params.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function redeemExcessAsset({
  client,
  pool,
  txGroup,
  initiatorSigner
}: {
  client: any;
  pool: PoolInfo;
  txGroup: SignerTransaction[];
  initiatorSigner: InitiatorSigner;
}): Promise<{
  fees: number;
  confirmedRound: number;
  groupID: string;
  txnID: string;
}>;
/**
 * Execute redeem operations to collect all excess assets from previous operations.
 *
 * @param params.client An Algodv2 client.
 * @param params.data.pool Information for the pool.
 * @param params.data.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or liquidityTokenID.
 * @param params.data.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function redeemAllExcessAsset({
  client,
  data,
  initiatorSigner
}: {
  client: any;
  data: {
    pool: PoolInfo;
    txGroup: SignerTransaction[];
  }[];
  initiatorSigner: InitiatorSigner;
}): Promise<
  {
    fees: number;
    confirmedRound: number;
    groupID: string;
    txnID: string;
  }[]
>;
export declare const REDEEM_PROCESS_TXN_COUNT = 3;
export declare function generateRedeemTxns({
  client,
  pool,
  assetID,
  assetOut,
  initiatorAddr
}: {
  client: Algodv2;
  pool: PoolInfo;
  assetID: number;
  assetOut: number | bigint;
  initiatorAddr: string;
}): Promise<SignerTransaction[]>;
export interface ExcessAmountData {
  poolAddress: string;
  assetID: number;
  amount: number;
}
/**
 * Generates a list of excess amounts accumulated within an account.
 * @param params.client An Algodv2 client.
 * @param params.accountAddr The address of the account performing the redeem operation.
 * @param params.validatorAppID Validator APP ID
 * @returns List of excess amounts
 */
export declare function getExcessAmounts({
  client,
  accountAddr,
  validatorAppID
}: {
  client: any;
  accountAddr: string;
  validatorAppID: number;
}): Promise<ExcessAmountData[]>;
export interface ExcessAmountDataWithPoolAssetDetails {
  pool: {
    info: PoolInfo;
    asset1: TinymanAnalyticsApiAsset;
    asset2: TinymanAnalyticsApiAsset;
    liquidityAsset: TinymanAnalyticsApiAsset;
  };
  asset: TinymanAnalyticsApiAsset;
  amount: number;
}
/**
 * Generates a list of excess amounts accumulated within an account. Each item includes details of pool and its assets.
 * @param params.client An Algodv2 client.
 * @param params.accountAddr The address of the account performing the redeem operation.
 * @param params.validatorAppID Validator APP ID
 * @returns List of excess amounts
 */
export declare function getExcessAmountsWithPoolAssetDetails({
  client,
  accountAddr,
  validatorAppID
}: {
  client: any;
  accountAddr: string;
  validatorAppID: number;
}): Promise<ExcessAmountDataWithPoolAssetDetails[]>;
