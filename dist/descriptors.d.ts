export declare enum DataType {
    Text = "Text",
    I64 = "I64",
    U64 = "U64",
    F64 = "F64",
    Decimal = "Decimal",
    Bool = "Bool",
    Date = "Date",
    Timestamp = "Timestamp",
    Json = "Json"
}
export declare class PropertyDescriptor {
    name: string;
    dataType: DataType;
    nullable: boolean;
    columnNameString: string;
    isId: boolean;
    isVersion: boolean;
    constructor(name: string, dataType: DataType);
    static new(name: string, dataType: DataType): PropertyDescriptor;
    columnName(name: string): this;
    notNull(): this;
    id(): this;
    version(): this;
}
export declare class RelationDescriptor {
    name: string;
    targetEntity: string;
    localKeyValue: string;
    foreignKeyValue: string;
    isMany: boolean;
    isAttach: boolean;
    isDeleteMissing: boolean;
    constructor(name: string, targetEntity: string);
    static new(name: string, targetEntity: string): RelationDescriptor;
    localKey(key: string): this;
    foreignKey(key: string): this;
    many(many?: boolean): this;
    attach(attach?: boolean): this;
    detached(): this;
    deleteMissing(deleteMissing?: boolean): this;
    keepMissing(): this;
}
export declare class EntityDescriptor {
    name: string;
    tableNameValue: string;
    dataServiceName?: string;
    properties: PropertyDescriptor[];
    relations: RelationDescriptor[];
    auditMaskFieldList: string[];
    auditValueMaxLenValue?: number;
    constructor(name: string);
    static new(name: string): EntityDescriptor;
    tableName(name: string): this;
    dataService(name: string): this;
    property(prop: PropertyDescriptor): this;
    relation(rel: RelationDescriptor): this;
    auditMaskFields(fields: string[]): this;
    auditValueMaxLen(len: number): this;
    propertyByName(name: string): PropertyDescriptor | undefined;
    relationByName(name: string): RelationDescriptor | undefined;
    idProperty(): PropertyDescriptor | undefined;
    versionProperty(): PropertyDescriptor | undefined;
}
//# sourceMappingURL=descriptors.d.ts.map