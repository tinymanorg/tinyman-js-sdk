import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
export declare class Proposal {
    index: number;
    creationTimestamp: number;
    votingStartTimestamp: number;
    votingEndTimestamp: number;
    snapshotTotalVotingPower: number;
    voteCount: number;
    quorumNumerator: number;
    againstVotingPower: number;
    forVotingPower: number;
    abstainVotingPower: number;
    isApproved: boolean;
    isCancelled: boolean;
    isExecuted: boolean;
    isQuorumReached: boolean;
    proposerAddress: string;
    executionHash: string;
    executorAddress: string;
    constructor(index: number, creationTimestamp: number, votingStartTimestamp: number, votingEndTimestamp: number, snapshotTotalVotingPower: number, voteCount: number, quorumNumerator: number, againstVotingPower: number, forVotingPower: number, abstainVotingPower: number, isApproved: boolean, isCancelled: boolean, isExecuted: boolean, isQuorumReached: boolean, proposerAddress: string, executionHash: string, executorAddress: string);
    get snapshotTimestamp(): number;
}
export declare class ProposalVotingAppGlobalState {
    vaultAppId: number;
    proposalIndexCounter: number;
    votingDelay: number;
    votingDuration: number;
    proposalThreshold: number;
    proposalThresholdNumerator: number;
    quorumThreshold: number;
    approvalRequirement: number;
    manager: string;
    proposalManager: Uint8Array;
    constructor(vaultAppId: number, proposalIndexCounter: number, votingDelay: number, votingDuration: number, proposalThreshold: number, proposalThresholdNumerator: number, quorumThreshold: number, approvalRequirement: number, manager: string, proposalManager: Uint8Array);
}
export declare function getProposalBoxName(proposalId: string): Uint8Array;
export declare function getAttendanceSheetBoxName(address: string, boxIndex: number): Uint8Array;
export declare function getProposal(client: AlgodClient, appId: number, proposalId: string): Promise<Proposal | null>;
export declare function getStakingAttendanceSheetBoxName(address: string, boxIndex: number): Uint8Array;
