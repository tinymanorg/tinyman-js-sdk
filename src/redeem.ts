import algosdk from 'algosdk';
import { waitForTransaction } from './util';
import { PoolInfo } from './pool';

const REDEEM_ENCODED = Uint8Array.from([114, 101, 100, 101, 101, 109]); // 'redeem'

/**
 * Execute a redeem operation to collect excess assets from previous operations.
 * 
 * @param params.client An Algodv2 client.
 * @param params.pool Information for the pool.
 * @param params.assetID The ID of the asset being redeemed. Must match one of the pool's
 *   asset1ID, asset2ID, or liquidityTokenID.
 * @param params.assetOut The quantity of the asset being redeemed.
 * @param params.initiatorAddr The address of the account performing the redeem operation.
 * @param params.initiatorSigner A function that will sign transactions from the initiator's
 *   account.
 */
export async function redeemExcessAsset({
    client,
    pool,
    assetID,
    assetOut,
    initiatorAddr,
    initiatorSigner,
}: {
    client: any,
    pool: PoolInfo,
    assetID: number,
    assetOut: number | bigint,
    initiatorAddr: string,
    initiatorSigner: (txns: any[], index: number) => Promise<Uint8Array>
}): Promise<{
    fees: number,
    confirmedRound: number,
}> {
    const suggestedParams = await client.getTransactionParams().do();

    const validatorAppCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: pool.addr,
        appIndex: pool.validatorAppID,
        appArgs: [REDEEM_ENCODED],
        accounts: [initiatorAddr],
        suggestedParams,
    });

    let assetOutTxn;
    if (assetID === 0) {
        assetOutTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            amount: assetOut,
            suggestedParams,
        });
    } else {
        assetOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: pool.addr,
            to: initiatorAddr,
            assetIndex: assetID,
            amount: assetOut,
            suggestedParams,
        });
    }

    let txnFees = validatorAppCallTxn.fee + assetOutTxn.fee;

    const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: initiatorAddr,
        to: pool.addr,
        amount: validatorAppCallTxn.fee + assetOutTxn.fee,
        suggestedParams,
    });

    txnFees += feeTxn.fee;

    const txGroup: any[] = algosdk.assignGroupID([
        feeTxn,
        validatorAppCallTxn,
        assetOutTxn,
    ]);

    const lsig = algosdk.makeLogicSig(pool.program);
    const signedFeeTxn = await initiatorSigner(txGroup, 0);

    const signedTxns = txGroup.map((txn, index) => {
        if (index === 0) {
            return signedFeeTxn;
        }
        const { blob } = algosdk.signLogicSigTransactionObject(txn, lsig);
        return blob;
    });

    const { txId } = await client.sendRawTransaction(signedTxns).do();

    const status = await waitForTransaction(client, txId);
    const confirmedRound: number = status['confirmed-round'];

    return {
        fees: txnFees,
        confirmedRound,
    };
}
