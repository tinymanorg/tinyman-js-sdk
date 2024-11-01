import {StructDefinition} from "../util/client/base/types";
import {SupportedNetwork} from "../util/commonTypes";

const CURRENT_REWARD_RATE_PER_TIME_END_TIMESTAMP_KEY =
  "current_reward_rate_per_time_end_timestamp";

const STAKE_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 724519988,
  mainnet: NaN
};

const RESTAKE_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 724676904,
  mainnet: NaN
};

const VAULT_APP_ID: Record<SupportedNetwork, number> = {
  testnet: 480164661,
  mainnet: NaN
};

const STRUCTS: Record<string, StructDefinition> = {
  UserState: {
    size: 32,
    fields: {
      staked_amount: {
        type: "int",
        size: 8,
        offset: 0
      },
      accumulated_rewards_per_unit_at_last_update: {
        type: "int",
        size: 8,
        offset: 8
      },
      accumulated_rewards: {
        type: "int",
        size: 8,
        offset: 16
      },
      timestamp: {
        type: "int",
        size: 8,
        offset: 24
      }
    }
  }
};

export {
  CURRENT_REWARD_RATE_PER_TIME_END_TIMESTAMP_KEY,
  RESTAKE_APP_ID,
  STAKE_APP_ID,
  STRUCTS,
  VAULT_APP_ID
};
