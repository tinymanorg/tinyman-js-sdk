import {decodeAddress} from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";

import {encodeString} from "../../util/util";
import {getProposalBoxName} from "../proposal-voting/storage";
import {bytesToInt, intToBytes} from "../util/utils";
import {concatUint8Arrays, getRawBoxValue} from "../utils";
import {
  PROPOSAL_BOX_PREFIX,
  STAKING_ATTENDANCE_BOX_PREFIX,
  STAKING_VOTE_BOX_PREFIX
} from "./constants";

class StakingDistributionProposal {
  index: number;
  creationTimestamp: number;
  votingStartTimestamp: number;
  votingEndTimestamp: number;
  votingPower: number;
  voteCount: number;
  isCancelled: boolean;

  // eslint-disable-next-line max-params
  constructor(
    index: number,
    creationTimestamp: number,
    votingStartTimestamp: number,
    votingEndTimestamp: number,
    votingPower: number,
    voteCount: number,
    isCancelled: boolean
  ) {
    this.index = index;
    this.creationTimestamp = creationTimestamp;
    this.votingStartTimestamp = votingStartTimestamp;
    this.votingEndTimestamp = votingEndTimestamp;
    this.votingPower = votingPower;
    this.voteCount = voteCount;
    this.isCancelled = isCancelled;
  }
}

function getStakingDistributionProposalBoxName(proposalId: string): Uint8Array {
  return concatUint8Arrays(PROPOSAL_BOX_PREFIX, encodeString(proposalId));
}

function getStakingAttendanceSheetBoxName(sender: string, boxIndex: number) {
  return concatUint8Arrays(
    STAKING_ATTENDANCE_BOX_PREFIX,
    decodeAddress(sender).publicKey,
    intToBytes(boxIndex)
  );
}

function getStakingVoteBoxName(proposalIndex: number, assetId: number): Uint8Array {
  return concatUint8Arrays(
    STAKING_VOTE_BOX_PREFIX,
    intToBytes(proposalIndex),
    intToBytes(assetId)
  );
}

function parseBoxStakingDistributionProposal(
  rawBox: Uint8Array
): StakingDistributionProposal {
  const proposal = new StakingDistributionProposal(
    bytesToInt(rawBox.slice(0, 8)),
    bytesToInt(rawBox.slice(8, 16)),
    bytesToInt(rawBox.slice(16, 24)),
    bytesToInt(rawBox.slice(24, 32)),
    bytesToInt(rawBox.slice(32, 40)),
    bytesToInt(rawBox.slice(40, 48)),
    Boolean(bytesToInt(rawBox.slice(48, 49)))
  );

  return proposal;
}

async function getStakingDistributionProposal(
  algod: AlgodClient,
  appId: number,
  proposalId: string
) {
  const boxName = getProposalBoxName(proposalId);
  const rawBox = await getRawBoxValue(algod, appId, boxName);

  if (!rawBox) {
    return null;
  }

  return parseBoxStakingDistributionProposal(rawBox);
}

export {
  getStakingAttendanceSheetBoxName,
  getStakingDistributionProposal,
  getStakingDistributionProposalBoxName,
  getStakingVoteBoxName,
  StakingDistributionProposal
};
