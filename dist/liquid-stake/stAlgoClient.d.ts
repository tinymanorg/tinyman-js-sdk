import algosdk from "algosdk";
import { SupportedNetwork } from "../util/commonTypes";
import TinymanBaseClient from "../util/client/base/baseClient";
declare class TinymanSTAlgoClient extends TinymanBaseClient {
    vaultAppId: number;
    constructor(algod: algosdk.Algodv2, network: SupportedNetwork);
    increaseStake(amount: number, userAddress: string): Promise<algosdk.Transaction[]>;
    decreaseStake(amount: number, userAddress: string): Promise<algosdk.Transaction[]>;
    claimRewards(userAddress: string): Promise<algosdk.Transaction[]>;
    calculateIncreaseStakeFee(accountAddress: string, minFee: bigint): Promise<number>;
    calculateDecreaseStakeFee(accountAddress: string, minFee: bigint): Promise<number>;
    private getUserStateBoxName;
    private getApplyRateChangeTxnIfNeeded;
    private getUserBoxPaymentTxnIfNeeded;
    private getUserBoxPaymentTxn;
    private shouldApplyRateChange;
    private getApplyRateChangeTxn;
}
export { TinymanSTAlgoClient };
