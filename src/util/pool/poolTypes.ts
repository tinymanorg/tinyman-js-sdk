import {LogicSigAccount} from "algosdk";

import {ContractVersionValue} from "../../contract/types";

export enum PoolStatus {
  NOT_CREATED = "not created",
  BOOTSTRAP = "bootstrap",
  READY = "ready",
  ERROR = "error"
}

export interface PoolInfo {
  account: LogicSigAccount;
  contractVersion: ContractVersionValue;
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  liquidityTokenID?: number;
  totalFeeShare?: bigint;
  status: PoolStatus;
}

export interface PoolReserves {
  round: number;
  asset1: bigint;
  asset2: bigint;
  issuedLiquidity: bigint;
}
