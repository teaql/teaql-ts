"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityDescriptor = exports.RelationDescriptor = exports.PropertyDescriptor = exports.DataType = void 0;
var DataType;
(function (DataType) {
    DataType["Text"] = "Text";
    DataType["I64"] = "I64";
    DataType["U64"] = "U64";
    DataType["F64"] = "F64";
    DataType["Decimal"] = "Decimal";
    DataType["Bool"] = "Bool";
    DataType["Date"] = "Date";
    DataType["Timestamp"] = "Timestamp";
    DataType["Json"] = "Json";
})(DataType || (exports.DataType = DataType = {}));
class PropertyDescriptor {
    constructor(name, dataType) {
        this.nullable = true;
        this.isId = false;
        this.isVersion = false;
        this.name = name;
        this.dataType = dataType;
        this.columnNameString = name;
    }
    static new(name, dataType) {
        return new PropertyDescriptor(name, dataType);
    }
    columnName(name) {
        this.columnNameString = name;
        return this;
    }
    notNull() {
        this.nullable = false;
        return this;
    }
    id() {
        this.isId = true;
        return this;
    }
    version() {
        this.isVersion = true;
        return this;
    }
}
exports.PropertyDescriptor = PropertyDescriptor;
class RelationDescriptor {
    constructor(name, targetEntity) {
        this.localKeyValue = 'id';
        this.foreignKeyValue = 'id';
        this.isMany = false;
        this.isAttach = true;
        this.isDeleteMissing = true;
        this.name = name;
        this.targetEntity = targetEntity;
    }
    static new(name, targetEntity) {
        return new RelationDescriptor(name, targetEntity);
    }
    localKey(key) {
        this.localKeyValue = key;
        return this;
    }
    foreignKey(key) {
        this.foreignKeyValue = key;
        return this;
    }
    many(many = true) {
        this.isMany = many;
        return this;
    }
    attach(attach = true) {
        this.isAttach = attach;
        return this;
    }
    detached() {
        this.isAttach = false;
        return this;
    }
    deleteMissing(deleteMissing = true) {
        this.isDeleteMissing = deleteMissing;
        return this;
    }
    keepMissing() {
        this.isDeleteMissing = false;
        return this;
    }
}
exports.RelationDescriptor = RelationDescriptor;
class EntityDescriptor {
    constructor(name) {
        this.properties = [];
        this.relations = [];
        this.auditMaskFieldList = [];
        this.name = name;
        this.tableNameValue = name.toLowerCase(); // Default fallback
    }
    static new(name) {
        return new EntityDescriptor(name);
    }
    tableName(name) {
        this.tableNameValue = name;
        return this;
    }
    dataService(name) {
        this.dataServiceName = name;
        return this;
    }
    property(prop) {
        this.properties.push(prop);
        return this;
    }
    relation(rel) {
        this.relations.push(rel);
        return this;
    }
    auditMaskFields(fields) {
        this.auditMaskFieldList = fields;
        return this;
    }
    auditValueMaxLen(len) {
        this.auditValueMaxLenValue = len;
        return this;
    }
    propertyByName(name) {
        return this.properties.find(p => p.name === name);
    }
    relationByName(name) {
        return this.relations.find(r => r.name === name);
    }
    idProperty() {
        return this.properties.find(p => p.isId);
    }
    versionProperty() {
        return this.properties.find(p => p.isVersion);
    }
}
exports.EntityDescriptor = EntityDescriptor;
//# sourceMappingURL=descriptors.js.map