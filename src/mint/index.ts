import {ContractVersion} from "../contract/contract";
import * as MintV1_1 from "./v1_1";
import * as MintV2 from "./v2";

export const Mint = {
  [ContractVersion.V1_1]: MintV1_1,
  [ContractVersion.V2]: MintV2
};

export const MINT_PROCESS_TXN_COUNT = 5;
