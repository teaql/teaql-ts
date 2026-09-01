import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    columns: {"id": { columnName: "id", modelName: "id", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"workItemList": { targetEntity: "WorkItem", localKey: "id", foreignKey: "platform", many: true }}
},
"WorkItem": {
    table: "work_item_data",
    columns: {"id": { columnName: "id", modelName: "id", logicalType: "integer", decode: "string", nullable: false }, "title": { columnName: "title", modelName: "title", logicalType: "text", decode: "native", nullable: false }, "description": { columnName: "description", modelName: "description", logicalType: "text", decode: "native", nullable: true }, "platform": { columnName: "platform", modelName: "platform", logicalType: "integer", decode: "string", nullable: false }, "version": { columnName: "version", modelName: "version", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }}
}
};