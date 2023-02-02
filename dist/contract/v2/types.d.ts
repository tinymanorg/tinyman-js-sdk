export interface V2ValidatorApp {
    type: string;
    global_state_schema: V2ValidatorAppStateSchema;
    local_state_schema: V2ValidatorAppStateSchema;
    name: string;
}
interface V2ValidatorAppStateSchema {
    num_uints: number;
    num_byte_slices: number;
}
export interface V2PoolLogicSig {
    type: string;
    logic: {
        bytecode: string;
    };
    name: string;
}
export {};
