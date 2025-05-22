import { StructDefinition } from "../util/client/base/types";
import { SupportedNetwork } from "../util/commonTypes";
import { OrderType } from "./types";
declare const TOTAL_ORDER_COUNT_KEY: Uint8Array;
declare const GOVERNOR_ORDER_FEE_RATE_KEY: Uint8Array;
declare const GOVERNOR_FEE_RATE_POWER_THRESHOLD_KEY: Uint8Array;
declare const ORDER_FEE_RATE_KEY: Uint8Array;
declare const APP_VERSION_KEY: Uint8Array;
declare const ORDER_STRUCTS: Record<OrderType, StructDefinition>;
declare const REGISTRY_STRUCT: Record<string, StructDefinition>;
declare const ORDER_APP_GLOBAL_SCHEMA: {
    numUint: number;
    numByteSlice: number;
};
declare const ORDER_APP_LOCAL_SCHEMA: {
    numUint: number;
    numByteSlice: number;
};
declare const ORDER_APP_EXTRA_PAGES = 1;
declare const REGISTRY_APP_ID: Record<SupportedNetwork, number>;
declare const VAULT_APP_ID: Record<SupportedNetwork, number>;
declare const ROUTER_APP_ID: Record<SupportedNetwork, number>;
declare const MINIMUM_BALANCE_REQUIREMENT_PER_APP = 100000;
declare const MINIMUM_PUT_ORDER_TRANSACTION_COUNT = 4;
declare const APPROVAL_PROGRAM = "CoASY3JlYXRlX2FwcGxpY2F0aW9ugBJ1cGRhdGVfYXBwbGljYXRpb26AC3Bvc3RfdXBkYXRlgAxhc3NldF9vcHRfaW6AEXB1dF90cmlnZ2VyX29yZGVygBRjYW5jZWxfdHJpZ2dlcl9vcmRlcoAbc3RhcnRfZXhlY3V0ZV90cmlnZ2VyX29yZGVygBllbmRfZXhlY3V0ZV90cmlnZ2VyX29yZGVygBNwdXRfcmVjdXJyaW5nX29yZGVygBZjYW5jZWxfcmVjdXJyaW5nX29yZGVygFdleGVjdXRlX3JlY3VycmluZ19vcmRlcoAHY29sbGVjdDYaAI4MAAEAEQAhAC0AQgBmAHYAjgCmAM4A3gEFADEYgQASRDYaAReIARCBAUMxGYEEEkQ2GgEXiAG6gQFDMRmBABJEiAIrgQFDMRmBABJENhoBSRWBQBJEiAKzgQFDMRmBABJENhoBFzYaAhc2GgMXNhoEFzYaBRc2GgYXiALNgQFD";
declare const CLEAR_PROGRAM = "CoEBQw==";
export { ORDER_APP_EXTRA_PAGES, ORDER_APP_GLOBAL_SCHEMA, ORDER_APP_LOCAL_SCHEMA, REGISTRY_APP_ID, ORDER_STRUCTS, REGISTRY_STRUCT, TOTAL_ORDER_COUNT_KEY, VAULT_APP_ID, MINIMUM_BALANCE_REQUIREMENT_PER_APP, GOVERNOR_ORDER_FEE_RATE_KEY, GOVERNOR_FEE_RATE_POWER_THRESHOLD_KEY, ORDER_FEE_RATE_KEY, MINIMUM_PUT_ORDER_TRANSACTION_COUNT, APPROVAL_PROGRAM, CLEAR_PROGRAM, ROUTER_APP_ID, APP_VERSION_KEY };
