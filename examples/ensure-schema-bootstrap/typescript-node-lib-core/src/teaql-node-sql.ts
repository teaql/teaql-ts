import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"schoolTypeList": { targetEntity: "SchoolType", localKey: "id", foreignKey: "platform", many: true }, "schoolList": { targetEntity: "School", localKey: "id", foreignKey: "platform", many: true }}
},
"SchoolType": {
    table: "school_type_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "code": { columnName: "code", modelName: "code", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "schoolList": { targetEntity: "School", localKey: "id", foreignKey: "schoolType", many: true }}
},
"School": {
    table: "school_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "schoolType": { columnName: "school_type", modelName: "school_type", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "schoolType": { targetEntity: "SchoolType", localKey: "schoolType", foreignKey: "id", many: false }}
}
};