import {Algodv2, decodeAddress, encodeAddress} from "algosdk";

import {getRawBoxValue} from "../utils";
import {ATTENDANCE_SHEET_BOX_PREFIX, PROPOSAL_BOX_PREFIX} from "./constants";
import {encodeString, intToBytes, joinByteArrays} from "../../util/util";

export class Proposal {
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

  // eslint-disable-next-line max-params
  constructor(
    index: number,
    creationTimestamp: number,
    votingStartTimestamp: number,
    votingEndTimestamp: number,
    snapshotTotalVotingPower: number,
    voteCount: number,
    quorumNumerator: number,
    againstVotingPower: number,
    forVotingPower: number,
    abstainVotingPower: number,
    isApproved: boolean,
    isCancelled: boolean,
    isExecuted: boolean,
    isQuorumReached: boolean,
    proposerAddress: string,
    executionHash: string,
    executorAddress: string
  ) {
    this.index = index;
    this.creationTimestamp = creationTimestamp;
    this.votingStartTimestamp = votingStartTimestamp;
    this.votingEndTimestamp = votingEndTimestamp;
    this.snapshotTotalVotingPower = snapshotTotalVotingPower;
    this.voteCount = voteCount;
    this.quorumNumerator = quorumNumerator;
    this.againstVotingPower = againstVotingPower;
    this.forVotingPower = forVotingPower;
    this.abstainVotingPower = abstainVotingPower;
    this.isApproved = isApproved;
    this.isCancelled = isCancelled;
    this.isExecuted = isExecuted;
    this.isQuorumReached = isQuorumReached;
    this.proposerAddress = proposerAddress;
    this.executionHash = executionHash;
    this.executorAddress = executorAddress;
  }

  get snapshotTimestamp(): number {
    return this.creationTimestamp;
  }
}

export class ProposalVotingAppGlobalState {
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

  // eslint-disable-next-line max-params
  constructor(
    vaultAppId: bigint,
    proposalIndexCounter: bigint,
    votingDelay: bigint,
    votingDuration: bigint,
    proposalThreshold: bigint,
    proposalThresholdNumerator: bigint,
    quorumThreshold: bigint,
    approvalRequirement: bigint,
    manager: string,
    proposalManager: Uint8Array
  ) {
    this.vaultAppId = Number(vaultAppId);
    this.proposalIndexCounter = Number(proposalIndexCounter);
    this.votingDelay = Number(votingDelay);
    this.votingDuration = Number(votingDuration);
    this.proposalThreshold = Number(proposalThreshold);
    this.proposalThresholdNumerator = Number(proposalThresholdNumerator);
    this.quorumThreshold = Number(quorumThreshold);
    this.approvalRequirement = Number(approvalRequirement);
    this.manager = manager;
    this.proposalManager = proposalManager;
  }
}

export function getProposalBoxName(proposalId: string) {
  return joinByteArrays(PROPOSAL_BOX_PREFIX, encodeString(proposalId));
}

export function getAttendanceSheetBoxName(address: string, boxIndex: number) {
  return joinByteArrays(
    ATTENDANCE_SHEET_BOX_PREFIX,
    decodeAddress(address).publicKey,
    intToBytes(boxIndex)
  );
}

function parseBoxProposal(rawBox: Uint8Array) {
  const buffer = Buffer.from(rawBox);

  return new Proposal(
    buffer.readUIntBE(0, 8),
    buffer.readUIntBE(8, 8),
    buffer.readUIntBE(16, 8),
    buffer.readUIntBE(24, 8),
    buffer.readUIntBE(32, 8),
    buffer.readUIntBE(40, 8),
    buffer.readUIntBE(48, 8),
    buffer.readUIntBE(56, 8),
    buffer.readUIntBE(64, 8),
    buffer.readUIntBE(72, 8),
    Boolean(buffer.readUIntBE(80, 1)),
    Boolean(buffer.readUIntBE(81, 1)),
    Boolean(buffer.readUIntBE(82, 1)),
    Boolean(buffer.readUIntBE(83, 1)),
    encodeAddress(new Uint8Array(buffer.subarray(84, 116))),
    rawBox.slice(116, 150).toString(),
    encodeAddress(new Uint8Array(buffer.subarray(150, 182)))
  );
}

export async function getProposal(client: Algodv2, appId: number, proposalId: string) {
  const boxName = getProposalBoxName(proposalId);
  const rawBox = await getRawBoxValue(client, appId, boxName);

  if (!rawBox) {
    return null;
  }

  return parseBoxProposal(rawBox);
}
