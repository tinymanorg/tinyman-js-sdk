export interface V1_1ValidatorApp {
    type: string;
    global_state_schema: V1_1ValidatorAppStateSchema;
    local_state_schema: V1_1ValidatorAppStateSchema;
    name: string;
}
interface V1_1ValidatorAppStateSchema {
    num_uints: number;
    num_byte_slices: number;
}
export interface V1_1PoolLogicSig {
    type: string;
    logic: {
        bytecode: string;
        address: string;
        size: number;
        variables: {
            name: string;
            type: string;
            index: number;
            length: number;
        }[];
        source: string;
    };
    name: string;
}
export {};
