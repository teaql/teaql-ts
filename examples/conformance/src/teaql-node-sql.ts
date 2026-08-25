import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    columns: {"id": { columnName: "id", modelName: "id", logicalType: "integer", decode: "string" }, "name": { columnName: "name", modelName: "name", logicalType: "text", decode: "native" }, "version": { columnName: "version", modelName: "version", logicalType: "integer", decode: "number" }},
    relations: {"workItemList": { targetEntity: "WorkItem", localKey: "id", foreignKey: "platform", many: true }}},
"WorkItem": {
    table: "work_item_data",
    columns: {"id": { columnName: "id", modelName: "id", logicalType: "integer", decode: "string" }, "title": { columnName: "title", modelName: "title", logicalType: "text", decode: "native" }, "description": { columnName: "description", modelName: "description", logicalType: "text", decode: "native" }, "platform": { columnName: "platform", modelName: "platform", logicalType: "integer", decode: "string" }, "version": { columnName: "version", modelName: "version", logicalType: "integer", decode: "number" }}}
};