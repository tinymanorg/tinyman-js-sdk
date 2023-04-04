import { Algodv2 } from "algosdk";
import { InitiatorSigner, SignerTransaction } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { V2AddLiquidityExecution } from "./types";
export declare function signTxns({ txGroup, initiatorSigner }: {
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
/**
 * Execute an add liquidity operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.txGroup The transaction group to execute.
 */
export declare function execute({ client, pool, txGroup, signedTxns }: {
    client: Algodv2;
    pool: V2PoolInfo;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
}): Promise<V2AddLiquidityExecution>;
