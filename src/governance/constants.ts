import {SupportedNetwork} from "../util/commonTypes";

const HOUR_IN_S = 60 * 60;
const DAY_IN_S = 24 * HOUR_IN_S;
const WEEK_IN_S = 7 * DAY_IN_S;

const VAULT_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 480164661,
  // TODO: Update mainnet vault app id when it is available
  mainnet: NaN
};

const STAKING_VOTING_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 360907790,
  // TODO: Update mainnet staking voting app id when it is available
  mainnet: NaN
};

const REWARDS_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 336189106,
  // TODO: Update mainnet rewards app id when it is available
  mainnet: NaN
};

const PROPOSALS_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 383416252,
  // TODO: Update mainnet proposal app id when it is available
  mainnet: NaN
};

const PROPOSAL_VOTING_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 383416252,
  // TODO: Update mainnet proposal voting app id when it is available
  mainnet: NaN
};

const BOX_FLAT_MIN_BALANCE = 2_500;
const BOX_BYTE_MIN_BALANCE = 400;

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export {HOUR, DAY, WEEK};

const TWO_TO_THE_64 = 2 ** 64;

export {
  VAULT_APP_ID,
  STAKING_VOTING_APP_ID,
  REWARDS_APP_ID,
  BOX_BYTE_MIN_BALANCE,
  BOX_FLAT_MIN_BALANCE,
  TWO_TO_THE_64,
  WEEK_IN_S,
  PROPOSALS_APP_ID,
  DAY_IN_S,
  HOUR_IN_S,
  PROPOSAL_VOTING_APP_ID
};
