import { StructDefinition } from "../util/client/base/types";
import { SupportedNetwork } from "../util/commonTypes";
import { OrderStruct } from "./types";
declare const TOTAL_ORDER_COUNT_KEY: Uint8Array;
declare const GOVERNOR_ORDER_FEE_RATE_KEY: Uint8Array;
declare const GOVERNOR_FEE_RATE_POWER_THRESHOLD_KEY: Uint8Array;
declare const ORDER_FEE_RATE_KEY: Uint8Array;
declare const APP_LATEST_VERSION_KEY: Uint8Array;
declare const APP_VERSION_KEY: Uint8Array;
declare const ORDER_STRUCTS: Record<OrderStruct, StructDefinition>;
declare const ORDER_APP_GLOBAL_SCHEMA: {
    numUint: number;
    numByteSlice: number;
};
declare const ORDER_APP_LOCAL_SCHEMA: {
    numUint: number;
    numByteSlice: number;
};
declare const ORDER_APP_EXTRA_PAGES = 3;
declare const REGISTRY_APP_ID: Record<SupportedNetwork, number>;
declare const VAULT_APP_ID: Record<SupportedNetwork, number>;
declare const ROUTER_APP_ID: Record<SupportedNetwork, number>;
declare const MINIMUM_BALANCE_REQUIREMENT_PER_APP = 100000;
declare const MINIMUM_PUT_ORDER_TRANSACTION_COUNT = 5;
export { ORDER_APP_EXTRA_PAGES, ORDER_APP_GLOBAL_SCHEMA, ORDER_APP_LOCAL_SCHEMA, REGISTRY_APP_ID, ORDER_STRUCTS, TOTAL_ORDER_COUNT_KEY, VAULT_APP_ID, MINIMUM_BALANCE_REQUIREMENT_PER_APP, GOVERNOR_ORDER_FEE_RATE_KEY, GOVERNOR_FEE_RATE_POWER_THRESHOLD_KEY, ORDER_FEE_RATE_KEY, MINIMUM_PUT_ORDER_TRANSACTION_COUNT, ROUTER_APP_ID, APP_LATEST_VERSION_KEY, APP_VERSION_KEY };
