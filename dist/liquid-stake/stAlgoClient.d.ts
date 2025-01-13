import algosdk from "algosdk";
import TinymanBaseClient from "../util/client/base/baseClient";
import { SupportedNetwork } from "../util/commonTypes";
declare class TinymanSTAlgoClient extends TinymanBaseClient {
    vaultAppId: number;
    constructor(algod: algosdk.Algodv2, network: SupportedNetwork);
    increaseStake(amount: bigint, userAddress: string): Promise<algosdk.Transaction[]>;
    decreaseStake(amount: bigint, userAddress: string): Promise<algosdk.Transaction[]>;
    claimRewards(userAddress: string): Promise<algosdk.Transaction[]>;
    calculateIncreaseStakeFee(accountAddress: string, minFee: bigint): Promise<bigint>;
    calculateDecreaseStakeFee(accountAddress: string, minFee: bigint): Promise<bigint>;
    private getUserStateBoxName;
    private getApplyRateChangeTxnIfNeeded;
    private getUserBoxPaymentTxnIfNeeded;
    private getUserBoxPaymentTxn;
    private shouldApplyRateChange;
    private getApplyRateChangeTxn;
}
export { TinymanSTAlgoClient };
