import {
  BoxReference,
  SuggestedParams,
  assignGroupID,
  getApplicationAddress,
  makeApplicationNoOpTxnFromObject,
  makePaymentTxnWithSuggestedParamsFromObject
} from "algosdk";

import {
  StakingDistributionProposal,
  getStakingAttendanceSheetBoxName,
  getStakingDistributionProposalBoxName,
  getStakingVoteBoxName
} from "./storage";
import {
  STAKING_VOTE_MAX_OPTION_COUNT,
  STAKING_ATTENDANCE_BOX_COST,
  STAKING_VOTE_BOX_COST
} from "./constants";
import {concatUint8Arrays} from "../utils";
import {areBuffersEqual, intToBytes, sum} from "../util/utils";
import {getAccountPowerBoxName, getAccountStateBoxName} from "../vault/storage";
import {ACCOUNT_POWER_BOX_ARRAY_LEN} from "../vault/constants";
import {prepareBudgetIncreaseTxn} from "../transactions";
import {encodeString} from "../../util/util";

function prepareCastVoteForStakingDistributionProposalTransactions({
  stakingVotingAppId,
  vaultAppId,
  sender,
  proposalId,
  proposal,
  votes,
  assetIds,
  accountPowerIndex,
  appBoxNames,
  suggestedParams,
  appCallNote = null
}: {
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
}) {
  if (votes.length !== assetIds.length) {
    throw new Error("The number of votes must be equal to the number of asset ids");
  }

  if (assetIds.length > STAKING_VOTE_MAX_OPTION_COUNT) {
    throw new Error(
      `You cannot cast vote for more than ${STAKING_VOTE_MAX_OPTION_COUNT} different pools`
    );
  }

  if (sum(votes) !== 100) {
    throw new Error("The sum of the votes must equal 100%");
  }

  const argVotes = concatUint8Arrays(...votes.map((vote) => intToBytes(vote)));
  const argAssetIds = concatUint8Arrays(
    ...assetIds.map((assetId) => intToBytes(assetId))
  );

  const proposalBoxName = getStakingDistributionProposalBoxName(proposalId);

  const accountAttendanceSheetBoxIndex = Math.floor(proposal.index / (1024 * 8));
  const accountAttendanceSheetBoxName = getStakingAttendanceSheetBoxName(
    sender,
    accountAttendanceSheetBoxIndex
  );
  const createAttendanceSheetBox = !appBoxNames.some((appBoxName) =>
    areBuffersEqual(appBoxName, accountAttendanceSheetBoxName)
  );

  const accountStateBoxName = getAccountStateBoxName(sender);
  const accountPowerBoxIndex = Math.floor(
    accountPowerIndex / ACCOUNT_POWER_BOX_ARRAY_LEN
  );
  const accountPowerBoxName = getAccountPowerBoxName(sender, accountPowerBoxIndex);
  const nextAccountPowerBoxName = getAccountPowerBoxName(
    sender,
    accountPowerBoxIndex + 1
  );

  let newAssetCount = 0;
  const voteBoxes: BoxReference[] = [];

  for (const assetId of assetIds) {
    const voteBoxName = getStakingVoteBoxName(proposal.index, assetId);

    voteBoxes.push({appIndex: stakingVotingAppId, name: voteBoxName});
    if (!appBoxNames.some((appBoxName) => areBuffersEqual(appBoxName, voteBoxName))) {
      newAssetCount += 1;
    }
  }

  const boxes: BoxReference[] = [
    {appIndex: stakingVotingAppId, name: proposalBoxName},
    {appIndex: stakingVotingAppId, name: accountAttendanceSheetBoxName},
    ...voteBoxes,
    {appIndex: vaultAppId, name: accountStateBoxName},
    {appIndex: vaultAppId, name: accountPowerBoxName},
    {appIndex: vaultAppId, name: nextAccountPowerBoxName}
  ];

  let txns = [
    makeApplicationNoOpTxnFromObject({
      from: sender,
      suggestedParams,
      appIndex: stakingVotingAppId,
      appArgs: [
        encodeString("cast_vote"),
        encodeString(proposalId),
        argVotes,
        argAssetIds,
        intToBytes(accountPowerIndex)
      ],
      foreignApps: [vaultAppId],
      boxes: boxes.slice(0, 7),
      note: appCallNote ? encodeString(appCallNote) : undefined
    })
  ];

  txns[0].fee *= 2;

  if (boxes.length >= 7) {
    txns.push(
      prepareBudgetIncreaseTxn({
        sender,
        suggestedParams,
        index: vaultAppId,
        foreignApps: [stakingVotingAppId],
        boxes: boxes.slice(7, 14)
      })
    );
  }

  if (boxes.length >= 14) {
    txns.push(
      prepareBudgetIncreaseTxn({
        sender,
        suggestedParams,
        index: vaultAppId,
        foreignApps: [stakingVotingAppId],
        boxes: boxes.slice(14)
      })
    );
  }

  const paymentAmount =
    Number(createAttendanceSheetBox) * STAKING_ATTENDANCE_BOX_COST +
    newAssetCount * STAKING_VOTE_BOX_COST;

  if (paymentAmount) {
    txns = [
      makePaymentTxnWithSuggestedParamsFromObject({
        from: sender,
        suggestedParams,
        to: getApplicationAddress(stakingVotingAppId),
        amount: paymentAmount
      }),
      ...txns
    ];
  }

  return assignGroupID(txns);
}

export {prepareCastVoteForStakingDistributionProposalTransactions};
