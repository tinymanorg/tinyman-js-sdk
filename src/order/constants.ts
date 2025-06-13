import {StructDefinition} from "../util/client/base/types";
import {SupportedNetwork} from "../util/commonTypes";
import {encodeString} from "../util/util";
import {OrderStruct} from "./types";

const TOTAL_ORDER_COUNT_KEY = encodeString("order_count");
const GOVERNOR_ORDER_FEE_RATE_KEY = encodeString("governor_order_fee_rate");
const GOVERNOR_FEE_RATE_POWER_THRESHOLD_KEY = encodeString(
  "governor_fee_rate_power_threshold"
);
const ORDER_FEE_RATE_KEY = encodeString("order_fee_rate");
const APP_LATEST_VERSION_KEY = encodeString("latest_version");
const APP_VERSION_KEY = encodeString("version");

const ORDER_STRUCTS: Record<OrderStruct, StructDefinition> = {
  TriggerOrder: {
    size: 80,
    fields: {
      asset_id: {
        type: "int",
        size: 8,
        offset: 0
      },
      amount: {
        type: "int",
        size: 8,
        offset: 8
      },
      target_asset_id: {
        type: "int",
        size: 8,
        offset: 16
      },
      target_amount: {
        type: "int",
        size: 8,
        offset: 24
      },
      filled_amount: {
        type: "int",
        size: 8,
        offset: 32
      },
      collected_target_amount: {
        type: "int",
        size: 8,
        offset: 40
      },
      is_partial_allowed: {
        type: "int",
        size: 8,
        offset: 48
      },
      fee_rate: {
        type: "int",
        size: 8,
        offset: 56
      },
      creation_timestamp: {
        type: "int",
        size: 8,
        offset: 64
      },
      expiration_timestamp: {
        type: "int",
        size: 8,
        offset: 72
      }
    }
  },
  RecurringOrder: {
    size: 88,
    fields: {
      asset_id: {
        type: "int",
        size: 8,
        offset: 0
      },
      amount: {
        type: "int",
        size: 8,
        offset: 8
      },
      target_asset_id: {
        type: "int",
        size: 8,
        offset: 16
      },
      collected_target_amount: {
        type: "int",
        size: 8,
        offset: 24
      },
      min_target_amount: {
        type: "int",
        size: 8,
        offset: 32
      },
      max_target_amount: {
        type: "int",
        size: 8,
        offset: 40
      },
      remaining_recurrences: {
        type: "int",
        size: 8,
        offset: 48
      },
      interval: {
        type: "int",
        size: 8,
        offset: 56
      },
      fee_rate: {
        type: "int",
        size: 8,
        offset: 64
      },
      last_fill_timestamp: {
        type: "int",
        size: 8,
        offset: 72
      },
      creation_timestamp: {
        type: "int",
        size: 8,
        offset: 80
      }
    }
  },
  Entry: {
    size: 8,
    fields: {
      app_id: {
        type: "int",
        size: 8,
        offset: 0
      }
    }
  }
} as const;

const ORDER_APP_GLOBAL_SCHEMA = {
  numUint: 16,
  numByteSlice: 16
};
const ORDER_APP_LOCAL_SCHEMA = {
  numUint: 0,
  numByteSlice: 0
};
const ORDER_APP_EXTRA_PAGES = 3;

const REGISTRY_APP_ID: Record<SupportedNetwork, number> = {
  mainnet: 3019195131,
  testnet: 739800082
};

const VAULT_APP_ID: Record<SupportedNetwork, number> = {
  mainnet: 2200606875,
  testnet: 480164661
};

const ROUTER_APP_ID: Record<SupportedNetwork, number> = {
  mainnet: 2614712672,
  testnet: 730573191
};

const MINIMUM_BALANCE_REQUIREMENT_PER_APP = 100_000;

const MINIMUM_PUT_ORDER_TRANSACTION_COUNT = 5;

export {
  ORDER_APP_EXTRA_PAGES,
  ORDER_APP_GLOBAL_SCHEMA,
  ORDER_APP_LOCAL_SCHEMA,
  REGISTRY_APP_ID,
  ORDER_STRUCTS,
  TOTAL_ORDER_COUNT_KEY,
  VAULT_APP_ID,
  MINIMUM_BALANCE_REQUIREMENT_PER_APP,
  GOVERNOR_ORDER_FEE_RATE_KEY,
  GOVERNOR_FEE_RATE_POWER_THRESHOLD_KEY,
  ORDER_FEE_RATE_KEY,
  MINIMUM_PUT_ORDER_TRANSACTION_COUNT,
  ROUTER_APP_ID,
  APP_LATEST_VERSION_KEY,
  APP_VERSION_KEY
};
