import { Algodv2, SuggestedParams } from "algosdk";
import { SignerTransaction, SupportedNetwork } from "./util/commonTypes";
interface CreateCommitTxnOptions {
    suggestedParams: SuggestedParams;
    stakingAppID: number;
    initiatorAddr: string;
    liquidityAssetID: number;
    program: {
        accountAddress: string;
        id: number;
    };
    amount: number | bigint;
}
declare function prepareCommitTransactions({ client, stakingAppID, program, requiredAssetID, liquidityAssetID, amount, initiatorAddr }: Omit<CreateCommitTxnOptions, "suggestedParams"> & {
    client: Algodv2;
    requiredAssetID?: number;
}): Promise<SignerTransaction[]>;
declare function getStakingAppID(network: SupportedNetwork): 51948952 | 649588853;
export { prepareCommitTransactions, getStakingAppID };
