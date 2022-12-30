import { Algodv2 } from "algosdk";
import { SignerTransaction, InitiatorSigner } from "../../util/commonTypes";
import { PoolReserves, V2PoolInfo } from "../../util/pool/poolTypes";
import { V2RemoveLiquidityExecution, V2RemoveLiquidityQuote, V2SingleAssetRemoveLiquidityQuote } from "./types";
/**
 * Get a quote for how many of assets 1 and 2 a deposit of `poolTokenIn` is worth at this moment. This
 * does not execute any transactions.
 */
declare function getQuote({ pool, reserves, poolTokenIn }: {
    pool: V2PoolInfo;
    reserves: PoolReserves;
    poolTokenIn: number | bigint;
}): V2RemoveLiquidityQuote;
declare function getSingleAssetRemoveLiquidityQuote({ pool, reserves, poolTokenIn, assetOutID, decimals }: {
    pool: V2PoolInfo;
    reserves: PoolReserves;
    poolTokenIn: number | bigint;
    assetOutID: number;
    decimals: {
        assetIn: number;
        assetOut: number;
    };
}): V2SingleAssetRemoveLiquidityQuote;
/**
 * Generates transactions for multiple asset out remove liquidity operation
 */
declare function generateTxns({ client, pool, poolTokenIn, initiatorAddr, minAsset1Amount, minAsset2Amount, slippage }: {
    client: Algodv2;
    pool: V2PoolInfo;
    poolTokenIn: number | bigint;
    initiatorAddr: string;
    minAsset1Amount: number | bigint;
    minAsset2Amount: number | bigint;
    slippage: number;
}): Promise<SignerTransaction[]>;
/**
 * Generates transactions for single asset out remove liquidity operation
 */
declare function generateSingleAssetOutTxns({ client, pool, initiatorAddr, poolTokenIn, outputAssetId, minOutputAssetAmount, slippage }: {
    client: Algodv2;
    pool: V2PoolInfo;
    outputAssetId: number;
    poolTokenIn: number | bigint;
    initiatorAddr: string;
    minOutputAssetAmount: number | bigint;
    slippage: number;
}): Promise<SignerTransaction[]>;
declare function signTxns({ txGroup, initiatorSigner }: {
    txGroup: SignerTransaction[];
    initiatorSigner: InitiatorSigner;
}): Promise<Uint8Array[]>;
declare function execute({ client, txGroup, signedTxns }: {
    client: Algodv2;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
}): Promise<V2RemoveLiquidityExecution>;
export declare const RemoveLiquidityV2: {
    getQuote: typeof getQuote;
    getSingleAssetRemoveLiquidityQuote: typeof getSingleAssetRemoveLiquidityQuote;
    generateTxns: typeof generateTxns;
    generateSingleAssetOutTxns: typeof generateSingleAssetOutTxns;
    signTxns: typeof signTxns;
    execute: typeof execute;
};
export {};
