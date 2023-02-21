import { Algodv2 } from "algosdk";
import { ContractVersionValue } from "./contract/types";
import { SignerTransaction, SupportedNetwork } from "./util/commonTypes";
export declare const OPT_IN_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;
export declare const VALIDATOR_APP_ID: Record<ContractVersionValue, Record<SupportedNetwork, number>>;
/**
 * Get the Validator App ID for a network.
 *
 * @param {SupportedNetwork} network "mainnet" | "testnet".
 * @param {ContractVersion} version contract version.
 * @returns the Validator App ID
 */
export declare function getValidatorAppID(network: SupportedNetwork, contractVersion: ContractVersionValue): number;
export declare function generateOptIntoValidatorTxns({ client, network, contractVersion, initiatorAddr }: {
    client: Algodv2;
    network: SupportedNetwork;
    contractVersion: ContractVersionValue;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
export declare const OPT_OUT_VALIDATOR_APP_PROCESS_TXN_COUNT = 1;
export declare function generateOptOutOfValidatorTxns({ client, network, contractVersion, initiatorAddr }: {
    client: Algodv2;
    network: SupportedNetwork;
    contractVersion: ContractVersionValue;
    initiatorAddr: string;
}): Promise<SignerTransaction[]>;
