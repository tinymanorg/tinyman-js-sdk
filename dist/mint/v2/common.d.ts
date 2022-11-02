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
 * @param params.asset1In The quantity of the first asset being deposited.
 * @param params.asset2In The quantity of the second asset being deposited.
 * @param params.liquidityOut The quantity of liquidity tokens being withdrawn.
 * @param params.slippage The maximum acceptable slippage rate. Should be a number between 0 and 100
 *   and acts as a percentage of params.liquidityOut.
 * @param params.initiatorAddr The address of the account performing the mint operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export declare function execute({ client, pool, txGroup, signedTxns, mode }: {
    client: any;
    pool: V2PoolInfo;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    mode: V2MintType;
}): Promise<V2MintExecution>;
