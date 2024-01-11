import { Algodv2 } from "algosdk";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { FolksLendingAssetInfo } from "../types";
export declare function generateTxns({ client, pool, poolTokenIn, initiatorAddr, asset1Out, asset2Out, lendingManagerId, network }: {
    client: Algodv2;
    pool: Pick<V2PoolInfo, "account" | "poolTokenID">;
    poolTokenIn: number | bigint;
    initiatorAddr: string;
    asset1Out: Omit<FolksLendingAssetInfo, "amount">;
    asset2Out: Omit<FolksLendingAssetInfo, "amount">;
    lendingManagerId: number;
    network: SupportedNetwork;
}): Promise<SignerTransaction[]>;
export declare function getRemoveLiquidityTotalFee(): number;
