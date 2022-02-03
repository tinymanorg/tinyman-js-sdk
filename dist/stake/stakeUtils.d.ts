import {Algodv2} from "algosdk";
import {SignerTransaction, SupportedNetwork} from "../common-types";
declare function prepareCommitTransactions({
  client,
  stakingAppID,
  initiatorAddr,
  liquidityAssetID,
  program,
  amount
}: {
  client: Algodv2;
  stakingAppID: number;
  initiatorAddr: string;
  liquidityAssetID: number;
  program: {
    accountAddress: string;
    id: number;
  };
  amount: number | bigint;
}): Promise<SignerTransaction[]>;
declare function getStakingAppID(network: SupportedNetwork): 0 | 51948952;
export {prepareCommitTransactions, getStakingAppID};
