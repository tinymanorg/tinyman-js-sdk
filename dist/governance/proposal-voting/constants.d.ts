declare const PROPOSAL_BOX_PREFIX: Uint8Array;
declare const ATTENDANCE_SHEET_BOX_PREFIX: Uint8Array;
declare const ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE = 24;
declare const PROPOSAL_BOX_SIZE: number;
declare const PROPOSAL_BOX_COST: number;
declare const ATTENDANCE_SHEET_BOX_COST: number;
declare enum ProposalVote {
    Against = 0,
    For = 1,
    Abstain = 2
}
declare const EXECUTION_HASH_SIZE = 34;
declare const CREATE_PROPOSAL_DEFAULT_EXECUTION_HASH_ARGUMENT: Uint8Array;
export { PROPOSAL_BOX_PREFIX, PROPOSAL_BOX_SIZE, PROPOSAL_BOX_COST, ProposalVote, ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE, ATTENDANCE_SHEET_BOX_PREFIX, ATTENDANCE_SHEET_BOX_COST, EXECUTION_HASH_SIZE, CREATE_PROPOSAL_DEFAULT_EXECUTION_HASH_ARGUMENT };
