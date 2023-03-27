import { LogicSigAccount } from "algosdk";
import { ContractVersionValue } from "../../contract/types";
export declare enum PoolStatus {
    NOT_CREATED = "not created",
    BOOTSTRAP = "bootstrap",
    READY = "ready",
    ERROR = "error"
}
export interface V1PoolInfo {
    account: LogicSigAccount;
    contractVersion: ContractVersionValue;
    validatorAppID: number;
    asset1ID: number;
    asset2ID: number;
    status: PoolStatus;
    poolTokenID?: number;
}
export type V2PoolInfo = V1PoolInfo & {
    issuedPoolTokens?: bigint;
    asset1Reserves?: bigint;
    asset2Reserves?: bigint;
    asset1ProtocolFees?: bigint;
    asset2ProtocolFees?: bigint;
    totalFeeShare?: bigint;
    protocolFeeRatio?: number;
    cumulativePriceUpdateTimeStamp?: number;
};
export interface PoolReserves {
    asset1: bigint;
    asset2: bigint;
    issuedLiquidity: bigint;
    round: number;
}
export interface PoolAssets {
    asset1ID: number;
    asset2ID: number;
    poolTokenID: number;
}
