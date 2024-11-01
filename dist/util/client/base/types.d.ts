type StructField = {
    type: string;
    size: number;
    offset: number;
};
type StructDefinition = {
    size: number;
    fields: Record<string, StructField>;
};
export type { StructField, StructDefinition };
