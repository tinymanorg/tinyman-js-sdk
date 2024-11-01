import { StructDefinition } from "../util/client/base/types";
import { SupportedNetwork } from "../util/commonTypes";
declare const CURRENT_REWARD_RATE_PER_TIME_END_TIMESTAMP_KEY = "current_reward_rate_per_time_end_timestamp";
declare const STAKE_APP_ID: Record<SupportedNetwork, number>;
declare const RESTAKE_APP_ID: Record<SupportedNetwork, number>;
declare const VAULT_APP_ID: Record<SupportedNetwork, number>;
declare const STRUCTS: Record<string, StructDefinition>;
export { CURRENT_REWARD_RATE_PER_TIME_END_TIMESTAMP_KEY, RESTAKE_APP_ID, STAKE_APP_ID, STRUCTS, VAULT_APP_ID };
