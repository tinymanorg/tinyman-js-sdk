import {SupportedNetwork} from "../util/commonTypes";

const HOUR_IN_S = 60 * 60;
const DAY_IN_S = 24 * HOUR_IN_S;
const WEEK_IN_S = 7 * DAY_IN_S;
const SECOND_IN_MS = 1000;

const VAULT_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 480164661,
  mainnet: 2200606875
};

const STAKING_VOTING_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 360907790,
  mainnet: 2200609638
};

const REWARDS_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 336189106,
  mainnet: 2200608153
};

const PROPOSAL_VOTING_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 383416252,
  mainnet: 2200608887
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
  DAY_IN_S,
  HOUR_IN_S,
  SECOND_IN_MS,
  PROPOSAL_VOTING_APP_ID
};
