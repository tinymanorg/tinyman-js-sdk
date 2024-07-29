import { SuggestedParams } from "algosdk";
import { StakingDistributionProposal } from "./storage";
declare function prepareCastVoteForStakingDistributionProposalTransactions({ stakingVotingAppId, vaultAppId, sender, proposalId, proposal, votes, assetIds, accountPowerIndex, appBoxNames, suggestedParams, appCallNote }: {
    stakingVotingAppId: number;
    vaultAppId: number;
    sender: string;
    proposalId: string;
    proposal: StakingDistributionProposal;
    votes: number[];
    assetIds: number[];
    accountPowerIndex: number;
    appBoxNames: Uint8Array[];
    suggestedParams: SuggestedParams;
    appCallNote: string | null;
}): import("algosdk").Transaction[];
export { prepareCastVoteForStakingDistributionProposalTransactions };
