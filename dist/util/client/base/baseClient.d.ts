import algosdk, { Algodv2, Transaction } from "algosdk";
import { SignerTransaction, SupportedNetwork } from "../../commonTypes";
import { StructDefinition } from "./types";
import { Struct } from "./utils";
declare abstract class TinymanBaseClient<AppId extends number | null, AppAddress extends algosdk.Address | null> {
    protected algod: Algodv2;
    protected applicationAddress: AppAddress;
    protected network: SupportedNetwork;
    appId: AppId;
    readonly structs: Record<string, StructDefinition> | undefined;
    constructor(algod: Algodv2, appId: AppId, network: SupportedNetwork, structs?: Record<string, StructDefinition>);
    protected setupTxnFeeAndAssignGroupId({ txns, additionalFeeCount }: {
        txns: algosdk.Transaction[];
        additionalFeeCount?: number;
    }): algosdk.Transaction[];
    protected getGlobal(key: Uint8Array, defaultValue?: any, appId?: number): Promise<any>;
    protected calculateMinBalance({ accounts, assets, boxes }: {
        accounts?: number;
        assets?: number;
        boxes?: Record<string, Struct>;
    }): number;
    protected boxExists(boxName: Uint8Array, appId?: number): Promise<boolean>;
    protected getBox(boxName: Uint8Array, structName: string, appId?: number, structs?: Record<string, StructDefinition>): Promise<Struct | null>;
    protected getOptinTxnIfNeeded(sender: string, assetId: number): Promise<algosdk.Transaction[]>;
    protected isOptedIn(accountAddress: string | algosdk.Address, assetId: number): Promise<boolean>;
    protected getSuggestedParams(): Promise<import("algosdk/dist/types/client/v2/algod/suggestedParams").SuggestedParamsFromAlgod>;
    convertStandardTransactionsToSignerTransactions(txns: Transaction[], signer: string | string[]): SignerTransaction[];
}
export default TinymanBaseClient;
