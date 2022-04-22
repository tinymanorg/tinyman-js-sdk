export enum PoolStatus {
  NOT_CREATED = "not created",
  BOOTSTRAP = "bootstrap",
  READY = "ready",
  ERROR = "error"
}

export interface PoolInfo {
  addr: string;
  program: Uint8Array;
  validatorAppID: number;
  asset1ID: number;
  asset2ID: number;
  liquidityTokenID?: number;
  status: PoolStatus;
}

export interface PoolReserves {
  round: number;
  asset1: bigint;
  asset2: bigint;
  issuedLiquidity: bigint;
}
