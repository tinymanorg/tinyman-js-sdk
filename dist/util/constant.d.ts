import { SupportedNetwork } from "./commonTypes";
export declare const MAX_SLIPPAGE_FRACTION_DIGITS = 6;
export declare const DEFAULT_FEE_TXN_NOTE: Uint8Array;
export declare const BASE_MINIMUM_BALANCE = 100000;
export declare const MINIMUM_BALANCE_REQUIRED_PER_ASSET = 100000;
export declare const MINIMUM_BALANCE_REQUIRED_PER_APP = 100000;
export declare const MINIMUM_BALANCE_REQUIRED_PER_CREATED_APP = 100000;
export declare const MINIMUM_BALANCE_REQUIRED_PER_EXTRA_APP_PAGE = 100000;
export declare const MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA = 50000;
export declare const MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE = 28500;
export declare const MINIMUM_ADD_LIQUIDITY_AMOUNT = 1000;
export declare const DEFAULT_WAIT_FOR_CONFIRMATION_ROUNDS = 1000;
export declare const TINYMAN_ANALYTICS_API_BASE_URLS: Record<SupportedNetwork, {
    base: string;
    v1: string;
}>;
