export interface TinymanAnalyticsApiAsset {
    id: string;
    is_liquidity_token: boolean;
    name: string;
    unit_name: string;
    decimals: number;
    url: string;
    total_amount: string;
    clawback_address: string;
    liquidity_in_usd?: null | string;
    last_day_volume_in_usd?: null | string;
    last_day_price_change?: null | string;
}
export interface AssetWithIdAndAmount {
    id: number;
    amount: bigint;
}
export interface AssetWithIdAndDecimals {
    id: number;
    decimals: number;
}
export interface AssetWithAmountAndDecimals {
    amount: bigint;
    decimals: number;
}
export interface AssetWithIdAndAmountAndDecimals {
    id: number;
    amount: bigint;
    decimals: number;
}
