import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Tenant": {
    table: "tenant_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"purchaseOrderList": { targetEntity: "PurchaseOrder", localKey: "id", foreignKey: "tenant", many: true }, "orderItemList": { targetEntity: "OrderItem", localKey: "id", foreignKey: "tenant", many: true }}
},
"PurchaseOrder": {
    table: "purchase_order_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "tenant": { columnName: "tenant", modelName: "tenant", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "contactPhone": { columnName: "contact_phone", modelName: "contact_phone", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "internalNote": { columnName: "internal_note", modelName: "internal_note", logPolicy: "plain", logicalType: "text", decode: "native", nullable: true }, "createTime": { columnName: "create_time", modelName: "create_time", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "updateTime": { columnName: "update_time", modelName: "update_time", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"tenant": { targetEntity: "Tenant", localKey: "tenant", foreignKey: "id", many: false }, "orderItemList": { targetEntity: "OrderItem", localKey: "id", foreignKey: "purchaseOrder", many: true }}
},
"OrderItem": {
    table: "order_item_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "purchaseOrder": { columnName: "purchase_order", modelName: "purchase_order", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "tenant": { columnName: "tenant", modelName: "tenant", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "productName": { columnName: "product_name", modelName: "product_name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "unitPrice": { columnName: "unit_price", modelName: "unit_price", logPolicy: "plain", logicalType: "decimal", decode: "decimal", nullable: false }, "createTime": { columnName: "create_time", modelName: "create_time", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "updateTime": { columnName: "update_time", modelName: "update_time", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"purchaseOrder": { targetEntity: "PurchaseOrder", localKey: "purchaseOrder", foreignKey: "id", many: false }, "tenant": { targetEntity: "Tenant", localKey: "tenant", foreignKey: "id", many: false }}
}
};