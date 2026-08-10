export enum DataType {
  Text = 'Text',
  I64 = 'I64',
  U64 = 'U64',
  F64 = 'F64',
  Decimal = 'Decimal',
  Bool = 'Bool',
  Date = 'Date',
  Timestamp = 'Timestamp',
  Json = 'Json'
}

export class PropertyDescriptor {
  public name: string;
  public dataType: DataType;
  public nullable: boolean = true;
  public columnNameString: string;
  public isId: boolean = false;
  public isVersion: boolean = false;

  constructor(name: string, dataType: DataType) {
    this.name = name;
    this.dataType = dataType;
    this.columnNameString = name;
  }

  static new(name: string, dataType: DataType): PropertyDescriptor {
    return new PropertyDescriptor(name, dataType);
  }

  columnName(name: string): this {
    this.columnNameString = name;
    return this;
  }

  notNull(): this {
    this.nullable = false;
    return this;
  }

  id(): this {
    this.isId = true;
    return this;
  }

  version(): this {
    this.isVersion = true;
    return this;
  }
}

export class RelationDescriptor {
  public name: string;
  public targetEntity: string;
  public localKeyValue: string = 'id';
  public foreignKeyValue: string = 'id';
  public isMany: boolean = false;
  public isAttach: boolean = true;
  public isDeleteMissing: boolean = true;

  constructor(name: string, targetEntity: string) {
    this.name = name;
    this.targetEntity = targetEntity;
  }

  static new(name: string, targetEntity: string): RelationDescriptor {
    return new RelationDescriptor(name, targetEntity);
  }

  localKey(key: string): this {
    this.localKeyValue = key;
    return this;
  }

  foreignKey(key: string): this {
    this.foreignKeyValue = key;
    return this;
  }

  many(many: boolean = true): this {
    this.isMany = many;
    return this;
  }

  attach(attach: boolean = true): this {
    this.isAttach = attach;
    return this;
  }

  detached(): this {
    this.isAttach = false;
    return this;
  }

  deleteMissing(deleteMissing: boolean = true): this {
    this.isDeleteMissing = deleteMissing;
    return this;
  }

  keepMissing(): this {
    this.isDeleteMissing = false;
    return this;
  }
}

export class EntityDescriptor {
  public name: string;
  public tableNameValue: string;
  public dataServiceName?: string;
  public properties: PropertyDescriptor[] = [];
  public relations: RelationDescriptor[] = [];
  public auditMaskFieldList: string[] = [];
  public auditValueMaxLenValue?: number;

  constructor(name: string) {
    this.name = name;
    this.tableNameValue = name.toLowerCase(); // Default fallback
  }

  static new(name: string): EntityDescriptor {
    return new EntityDescriptor(name);
  }

  tableName(name: string): this {
    this.tableNameValue = name;
    return this;
  }

  dataService(name: string): this {
    this.dataServiceName = name;
    return this;
  }

  property(prop: PropertyDescriptor): this {
    this.properties.push(prop);
    return this;
  }

  relation(rel: RelationDescriptor): this {
    this.relations.push(rel);
    return this;
  }

  auditMaskFields(fields: string[]): this {
    this.auditMaskFieldList = fields;
    return this;
  }

  auditValueMaxLen(len: number): this {
    this.auditValueMaxLenValue = len;
    return this;
  }

  propertyByName(name: string): PropertyDescriptor | undefined {
    return this.properties.find(p => p.name === name);
  }

  relationByName(name: string): RelationDescriptor | undefined {
    return this.relations.find(r => r.name === name);
  }

  idProperty(): PropertyDescriptor | undefined {
    return this.properties.find(p => p.isId);
  }

  versionProperty(): PropertyDescriptor | undefined {
    return this.properties.find(p => p.isVersion);
  }
}
