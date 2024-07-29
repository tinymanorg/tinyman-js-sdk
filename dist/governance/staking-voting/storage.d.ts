import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
declare class StakingDistributionProposal {
    index: number;
    creationTimestamp: number;
    votingStartTimestamp: number;
    votingEndTimestamp: number;
    votingPower: number;
    voteCount: number;
    isCancelled: boolean;
    constructor(index: number, creationTimestamp: number, votingStartTimestamp: number, votingEndTimestamp: number, votingPower: number, voteCount: number, isCancelled: boolean);
}
declare function getStakingDistributionProposalBoxName(proposalId: string): Uint8Array;
declare function getStakingAttendanceSheetBoxName(sender: string, boxIndex: number): Uint8Array;
declare function getStakingVoteBoxName(proposalIndex: number, assetId: number): Uint8Array;
declare function getStakingDistributionProposal(algod: AlgodClient, appId: number, proposalId: string): Promise<StakingDistributionProposal | null>;
export { StakingDistributionProposal, getStakingDistributionProposalBoxName, getStakingAttendanceSheetBoxName, getStakingVoteBoxName, getStakingDistributionProposal };
