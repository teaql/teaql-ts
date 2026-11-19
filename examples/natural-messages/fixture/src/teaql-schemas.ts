import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Catalog": {
    table: "catalog_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"entryList": { targetEntity: "Entry", localKey: "id", foreignKey: "catalog", many: true }}
},
"Entry": {
    table: "entry_data",
    auditMaskFields: ["name"],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "catalog": { columnName: "catalog", modelName: "catalog", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "bornAt": { columnName: "born_at", modelName: "born_at", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false, createFunction: "now" }, "touchedAt": { columnName: "touched_at", modelName: "touched_at", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false, createFunction: "now", updateFunction: "now" }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"catalog": { targetEntity: "Catalog", localKey: "catalog", foreignKey: "id", many: false }}
}
};