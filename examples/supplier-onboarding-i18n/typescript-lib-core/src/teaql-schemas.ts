import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Warehouse": {
    table: "warehouse_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"supplierList": { targetEntity: "Supplier", localKey: "id", foreignKey: "warehouse", many: true }}
},
"Supplier": {
    table: "supplier_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "warehouse": { columnName: "warehouse", modelName: "warehouse", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "minimumOrderQuantity": { columnName: "minimum_order_quantity", modelName: "minimum_order_quantity", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false, integer32: true }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"warehouse": { targetEntity: "Warehouse", localKey: "warehouse", foreignKey: "id", many: false }}
}
};