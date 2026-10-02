import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"workItemList": { targetEntity: "WorkItem", localKey: "id", foreignKey: "platform", many: true }}
},
"WorkItem": {
    table: "work_item_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "title": { columnName: "title", modelName: "title", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "description": { columnName: "description", modelName: "description", logPolicy: "plain", logicalType: "text", decode: "native", nullable: true }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }}
}
};