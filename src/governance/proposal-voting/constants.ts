import {encodeString} from "../../util/util";
import {BOX_FLAT_MIN_BALANCE, BOX_BYTE_MIN_BALANCE} from "../constants";

const PROPOSAL_BOX_PREFIX = encodeString("p");
const ATTENDANCE_SHEET_BOX_PREFIX = encodeString("a");

const ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE = 24;
const PROPOSAL_BOX_SIZE = 116 + 64 + 32;

const PROPOSAL_BOX_COST =
  BOX_FLAT_MIN_BALANCE + BOX_BYTE_MIN_BALANCE * (60 + PROPOSAL_BOX_SIZE);
const ATTENDANCE_SHEET_BOX_COST =
  BOX_FLAT_MIN_BALANCE + BOX_BYTE_MIN_BALANCE * (41 + ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE);

enum ProposalVote {
  Against = 0,
  For = 1,
  Abstain = 2
}
const EXECUTION_HASH_SIZE = 34;

const CREATE_PROPOSAL_DEFAULT_EXECUTION_HASH_ARGUMENT = new Uint8Array(
  EXECUTION_HASH_SIZE
);

const EXECUTOR_FALLBACK_ADDRESS =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

export {
  PROPOSAL_BOX_PREFIX,
  PROPOSAL_BOX_SIZE,
  PROPOSAL_BOX_COST,
  ProposalVote,
  ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE,
  ATTENDANCE_SHEET_BOX_PREFIX,
  ATTENDANCE_SHEET_BOX_COST,
  EXECUTION_HASH_SIZE,
  CREATE_PROPOSAL_DEFAULT_EXECUTION_HASH_ARGUMENT,
  EXECUTOR_FALLBACK_ADDRESS
};