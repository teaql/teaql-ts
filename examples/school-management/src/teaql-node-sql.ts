import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    columns: {"id": { columnName: "id", modelName: "id", logicalType: "integer", decode: "string" }, "name": { columnName: "name", modelName: "name", logicalType: "text", decode: "native" }, "baseUrl": { columnName: "base_url", modelName: "base_url", logicalType: "text", decode: "native" }, "createTime": { columnName: "create_time", modelName: "create_time", logicalType: "date", decode: "date" }, "updateTime": { columnName: "update_time", modelName: "update_time", logicalType: "date", decode: "date" }, "version": { columnName: "version", modelName: "version", logicalType: "integer", decode: "number" }},
    relations: {"schoolTypeList": { targetEntity: "SchoolType", localKey: "id", foreignKey: "platform", many: true }, "schoolList": { targetEntity: "School", localKey: "id", foreignKey: "platform", many: true }}
},
"SchoolType": {
    table: "school_type_data",
    columns: {"platform": { columnName: "platform", modelName: "platform", logicalType: "integer", decode: "string" }, "id": { columnName: "id", modelName: "id", logicalType: "integer", decode: "string" }, "name": { columnName: "name", modelName: "name", logicalType: "text", decode: "native" }, "code": { columnName: "code", modelName: "code", logicalType: "text", decode: "native" }, "displayOrder": { columnName: "display_order", modelName: "display_order", logicalType: "decimal", decode: "number" }, "version": { columnName: "version", modelName: "version", logicalType: "integer", decode: "number" }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "schoolList": { targetEntity: "School", localKey: "id", foreignKey: "schoolType", many: true }}
},
"School": {
    table: "school_data",
    columns: {"id": { columnName: "id", modelName: "id", logicalType: "integer", decode: "string" }, "platform": { columnName: "platform", modelName: "platform", logicalType: "integer", decode: "string" }, "schoolType": { columnName: "school_type", modelName: "school_type", logicalType: "integer", decode: "string" }, "name": { columnName: "name", modelName: "name", logicalType: "text", decode: "native" }, "address": { columnName: "address", modelName: "address", logicalType: "text", decode: "native" }, "establishedDate": { columnName: "established_date", modelName: "established_date", logicalType: "date", decode: "date" }, "studentCapacity": { columnName: "student_capacity", modelName: "student_capacity", logicalType: "integer", decode: "native" }, "active": { columnName: "active", modelName: "active", logicalType: "boolean", decode: "native" }, "createTime": { columnName: "create_time", modelName: "create_time", logicalType: "date", decode: "date" }, "updateTime": { columnName: "update_time", modelName: "update_time", logicalType: "date", decode: "date" }, "version": { columnName: "version", modelName: "version", logicalType: "integer", decode: "number" }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "schoolType": { targetEntity: "SchoolType", localKey: "schoolType", foreignKey: "id", many: false }}
}
};