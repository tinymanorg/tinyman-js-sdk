import { InitiatorSigner, SignerTransaction } from "../../util/commonTypes";
import { V2PoolInfo } from "../../util/pool/poolTypes";
import { V2MintExecution, V2MintType } from "../types";
export declare function signTxns({ txGroup, initiatorSigner }: {
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
/**
 * Execute a mint operation with the desired quantities.
 *
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.txGroup The transaction group to execute.
 * @param params.mode The mint mode.
 */
export declare function execute({ client, pool, txGroup, signedTxns, mode }: {
    client: any;
    pool: V2PoolInfo;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    mode: V2MintType;
}): Promise<V2MintExecution>;
