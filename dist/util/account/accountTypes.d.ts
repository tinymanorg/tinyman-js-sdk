import { AccountAsset } from "../asset/assetModels";
export interface AccountInformation {
    address: string;
    amount: number;
    "amount-without-pending-rewards": number;
    "apps-local-state": {
        id: number;
        "key-value"?: {
            key: string;
            value: {
                type: 1 | 2;
                bytes: string;
                uint: number;
            };
        }[];
        schema: {
            "num-byte-slice": number;
            "num-uint": number;
        };
    }[];
    "apps-total-schema": {
        "num-byte-slice": number;
        "num-uint": number;
    };
    assets: AccountAsset[];
    "created-apps": any[];
    "created-assets": Omit<AccountAsset, "asset-id"> & {
        index: number;
    }[];
    "pending-rewards": number;
    "reward-base": number;
    rewards: number;
    round: number;
    status: "Offline";
}
export type AccountInformationData = AccountInformation & {
    minimum_required_balance: number;
};
export interface AccountExcessWithinPool {
    excessAsset1: bigint;
    excessAsset2: bigint;
    excessPoolTokens: bigint;
}
export interface AccountExcess {
    poolAddress: string;
    assetID: number;
    amount: number;
}
