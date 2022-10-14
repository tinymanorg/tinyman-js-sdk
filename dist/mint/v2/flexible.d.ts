import algosdk from "algosdk";
import AlgodClient from "algosdk/dist/types/src/client/v2/algod/algod";
import { InitiatorSigner, SignerTransaction, SupportedNetwork } from "../../util/commonTypes";
import { PoolInfo } from "../../util/pool/poolTypes";
import { MintExecution } from "../types";
export declare function generateTxns({ client, pool, network, poolAddress, asset_1, asset_2, liquidityToken, initiatorAddr }: {
    client: AlgodClient;
    pool: PoolInfo;
    network: SupportedNetwork;
    poolAddress: string;
    asset_1: {
        id: number;
        amount: number | bigint;
    };
    asset_2: {
        id: number;
        amount: number | bigint;
    };
    liquidityToken: {
        id: number;
        amount: number | bigint;
    };
    slippage: number;
    initiatorAddr: string;
}): Promise<{
    txn: algosdk.Transaction;
    signers: string[];
}[]>;
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
export declare function execute({ client, pool, txGroup, signedTxns }: {
    client: any;
    pool: PoolInfo;
    txGroup: SignerTransaction[];
    signedTxns: Uint8Array[];
}): Promise<MintExecution>;
