import { Algodv2 } from "algosdk";
import { SignerTransaction, InitiatorSigner } from "../../util/commonTypes";
import { PoolReserves, V1PoolInfo } from "../../util/pool/poolTypes";
import { V1_1RemoveLiquidityQuote, V1_1RemoveLiquidityExecution } from "./types";
/**
 * Get a quote for how many of assets 1 and 2 a deposit of `poolTokenIn` is worth
 * at this moment. This does not execute any transactions.
 */
export declare function getQuote({ pool, reserves, poolTokenIn }: {
    pool: V1PoolInfo;
    reserves: PoolReserves;
    /**
     * The amount of the pool token being deposited.
     */
    poolTokenIn: number | bigint;
}): V1_1RemoveLiquidityQuote;
declare function generateTxns({ client, pool, poolTokenIn, asset1Out, asset2Out, slippage, initiatorAddr }: {
    client: Algodv2;
    pool: V1PoolInfo;
    poolTokenIn: number | bigint;
    asset1Out: number | bigint;
    asset2Out: number | bigint;
    slippage: number;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
declare function signTxns({ pool, txGroup, initiatorSigner }: {
    pool: V1PoolInfo;
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
declare function execute({ client, pool, txGroup, signedTxns, initiatorAddr }: {
    client: Algodv2;
    pool: V1PoolInfo;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
    /**
     * The address of the account performing the burn operation.
     */
    initiatorAddr: string;
}): Promise<V1_1RemoveLiquidityExecution>;
export declare const RemoveLiquidityV1_1: {
    generateTxns: typeof generateTxns;
    getQuote: typeof getQuote;
    signTxns: typeof signTxns;
    execute: typeof execute;
};
export {};
