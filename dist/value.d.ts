export type Value = {
    type: 'Null';
} | {
    type: 'Bool';
    value: boolean;
} | {
    type: 'I64';
    value: number;
} | {
    type: 'U64';
    value: number;
} | {
    type: 'F64';
    value: number;
} | {
    type: 'Decimal';
    value: number | string;
} | {
    type: 'Text';
    value: string;
} | {
    type: 'Json';
    value: any;
} | {
    type: 'Date';
    value: string | Date;
} | {
    type: 'Timestamp';
    value: number;
} | {
    type: 'Object';
    value: Record<string, Value>;
} | {
    type: 'List';
    value: Value[];
} | {
    type: 'TypedNull';
    dataType: string;
};
export declare const Values: {
    Null: () => Value;
    Bool: (value: boolean) => Value;
    I64: (value: number) => Value;
    U64: (value: number) => Value;
    F64: (value: number) => Value;
    Decimal: (value: number | string) => Value;
    Text: (value: string) => Value;
    Json: (value: any) => Value;
    Date: (value: string | Date) => Value;
    Timestamp: (value: number) => Value;
    Object: (value: Record<string, Value>) => Value;
    List: (value: Value[]) => Value;
    TypedNull: (dataType: string) => Value;
    isEmpty(v: Value): boolean;
    tryI64(v: Value): number | null;
};
//# sourceMappingURL=value.d.ts.map