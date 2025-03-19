import algosdk, {decodeAddress, getApplicationAddress, SuggestedParams} from "algosdk";

import {EXECUTOR_FALLBACK_ADDRESS} from "../../util/account/accountConstants";
import {encodeString} from "../../util/util";
import {intToBytes} from "../util/utils";
import {ACCOUNT_POWER_BOX_ARRAY_LEN} from "../vault/constants";
import {
  getAccountPowerBoxName,
  getAccountStateBoxName,
  getTotalPowerBoxName,
  VaultAppGlobalState
} from "../vault/storage";
import {
  ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE,
  ATTENDANCE_SHEET_BOX_COST,
  CREATE_PROPOSAL_DEFAULT_EXECUTION_HASH_ARGUMENT,
  PROPOSAL_BOX_COST,
  ProposalVote
} from "./constants";
import {getAttendanceSheetBoxName, getProposalBoxName, Proposal} from "./storage";
import {GenerateProposalMetadataPayload} from "./types";

export function generateProposalMetadata({
  category,
  description,
  discussionUrl,
  pollUrl,
  title
}: GenerateProposalMetadataPayload) {
  return {
    category: category.trim(),
    description: description.trim(),
    discussion_url: discussionUrl.trim(),
    poll_url: pollUrl.trim(),
    title: title.trim()
  };
}

export function prepareCreateProposalTransactions({
  proposalId,
  proposalVotingAppId,
  sender,
  vaultAppId,
  vaultAppGlobalState,
  executionHash,
  executor,
  suggestedParams,
  appCallNote
}: {
  proposalVotingAppId: number;
  sender: string;
  proposalId: string;
  vaultAppId: number;
  vaultAppGlobalState: VaultAppGlobalState;
  executionHash?: string;
  executor?: Uint8Array;
  suggestedParams: SuggestedParams;
  appCallNote?: string;
}) {
  const proposalBoxName = getProposalBoxName(proposalId);
  const accountStateBoxName = getAccountStateBoxName(sender);
  const lastTotalPowerBoxName = getTotalPowerBoxName(
    vaultAppGlobalState.lastTotalPowerBoxIndex
  );

  const txns: algosdk.Transaction[] = [
    algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: getApplicationAddress(proposalVotingAppId),
      amount: PROPOSAL_BOX_COST,
      suggestedParams
    }),
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      suggestedParams,
      appIndex: proposalVotingAppId,
      appArgs: [
        encodeString("create_proposal"),
        encodeString(proposalId),
        executionHash
          ? encodeString(executionHash)
          : CREATE_PROPOSAL_DEFAULT_EXECUTION_HASH_ARGUMENT,
        executor ?? decodeAddress(EXECUTOR_FALLBACK_ADDRESS).publicKey
      ],
      foreignApps: [vaultAppId],
      boxes: [
        {appIndex: proposalVotingAppId, name: proposalBoxName},
        {appIndex: vaultAppId, name: accountStateBoxName},
        {appIndex: vaultAppId, name: lastTotalPowerBoxName}
      ],
      note: appCallNote ? encodeString(appCallNote) : undefined
    })
  ];

  // 2 inner txns
  txns[1].fee *= 3n;

  return algosdk.assignGroupID(txns);
}

export function prepareCastVoteTransactions({
  accountPowerIndex,
  createAttendanceSheetBox,
  proposal,
  proposalId,
  proposalVotingAppId,
  sender,
  suggestedParams,
  vaultAppId,
  vote,
  appCallNote
}: {
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
}) {
  if (![ProposalVote.Abstain, ProposalVote.Against, ProposalVote.For].includes(vote)) {
    throw new Error("Invalid vote");
  }

  const accountPowerBoxIndex = Math.floor(
    accountPowerIndex / ACCOUNT_POWER_BOX_ARRAY_LEN
  );
  const accountAttendanceBoxIndex = Math.floor(
    proposal.index / (ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE * 8)
  );
  const boxes: algosdk.BoxReference[] = [
    {
      appIndex: proposalVotingAppId,
      name: getProposalBoxName(proposalId)
    },
    {
      appIndex: proposalVotingAppId,
      name: getAttendanceSheetBoxName(sender, accountAttendanceBoxIndex)
    },
    {
      appIndex: vaultAppId,
      name: getAccountStateBoxName(sender)
    },
    {
      appIndex: vaultAppId,
      name: getAccountPowerBoxName(sender, accountPowerBoxIndex)
    },
    {
      appIndex: vaultAppId,
      name: getAccountPowerBoxName(sender, accountPowerBoxIndex + 1)
    }
  ];

  const txns: algosdk.Transaction[] = [
    algosdk.makeApplicationNoOpTxnFromObject({
      sender,
      suggestedParams,
      appIndex: proposalVotingAppId,
      appArgs: [
        encodeString("cast_vote"),
        encodeString(proposalId),
        intToBytes(vote),
        intToBytes(accountPowerIndex)
      ],
      foreignApps: [vaultAppId],
      boxes,
      note: appCallNote ? encodeString(appCallNote) : undefined
    })
  ];

  // 1 inner txn
  txns[0].fee *= 2n;

  if (createAttendanceSheetBox) {
    const minimumBalancePaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender,
      receiver: getApplicationAddress(proposalVotingAppId),
      suggestedParams,
      amount: ATTENDANCE_SHEET_BOX_COST
    });

    txns.unshift(minimumBalancePaymentTxn);
  }

  return algosdk.assignGroupID(txns);
}
