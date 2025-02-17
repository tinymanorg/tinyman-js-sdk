import algosdk, { Algodv2 } from "algosdk";
import { SupportedNetwork } from "../../commonTypes";
import { StructDefinition } from "./types";
import { Struct } from "./utils";
declare abstract class TinymanBaseClient {
    algod: Algodv2;
    appId: number;
    applicationAddress: algosdk.Address;
    network: SupportedNetwork;
    readonly structs: Record<string, StructDefinition> | undefined;
    constructor(algod: Algodv2, appId: number, network: SupportedNetwork, structs?: Record<string, StructDefinition>);
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
    protected getBox(boxName: Uint8Array, structName: string, appId?: number): Promise<Struct | null>;
    protected getOptinTxnIfNeeded(sender: string, assetId: number): Promise<algosdk.Transaction[]>;
    protected isOptedIn(accountAddress: string, assetId: number): Promise<boolean>;
    protected getSuggestedParams(): Promise<import("algosdk/dist/types/client/v2/algod/suggestedParams").SuggestedParamsFromAlgod>;
}
export default TinymanBaseClient;
