import algosdk, { SuggestedParams } from "algosdk";
import { VaultAppGlobalState } from "../vault/storage";
import { ProposalVote } from "./constants";
import { Proposal } from "./storage";
import { GenerateProposalMetadataPayload } from "./types";
export declare function generateProposalMetadata({ category, description, discussionUrl, pollUrl, title }: GenerateProposalMetadataPayload): {
    category: string;
    description: string;
    discussion_url: string;
    poll_url: string;
    title: string;
};
export declare function prepareCreateProposalTransactions({ proposalId, proposalVotingAppId, sender, vaultAppId, vaultAppGlobalState, executionHash, executor, suggestedParams, appCallNote }: {
    proposalVotingAppId: number;
    sender: string;
    proposalId: string;
    vaultAppId: number;
    vaultAppGlobalState: VaultAppGlobalState;
    executionHash?: string;
    executor?: Uint8Array;
    suggestedParams: SuggestedParams;
    appCallNote?: string;
}): algosdk.Transaction[];
export declare function prepareCastVoteTransactions({ accountPowerIndex, createAttendanceSheetBox, proposal, proposalId, proposalVotingAppId, sender, suggestedParams, vaultAppId, vote, appCallNote }: {
    proposalVotingAppId: number;
    vaultAppId: number;
    sender: string;
    proposalId: string;
    proposal: Proposal;
    vote: ProposalVote;
    accountPowerIndex: number;
    createAttendanceSheetBox: boolean;
    suggestedParams: SuggestedParams;
    appCallNote?: string;
}): algosdk.Transaction[];
