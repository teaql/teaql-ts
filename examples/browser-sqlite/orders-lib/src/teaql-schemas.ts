import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"orderStatusList": { targetEntity: "OrderStatus", localKey: "id", foreignKey: "platform", many: true }, "customerList": { targetEntity: "Customer", localKey: "id", foreignKey: "platform", many: true }}
},
"OrderStatus": {
    table: "order_status_data",
    auditMaskFields: [],
    columns: {"platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "code": { columnName: "code", modelName: "code", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "color": { columnName: "color", modelName: "color", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "displayOrder": { columnName: "display_order", modelName: "display_order", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "customerOrderList": { targetEntity: "CustomerOrder", localKey: "id", foreignKey: "status", many: true }}
},
"Customer": {
    table: "customer_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "customerOrderList": { targetEntity: "CustomerOrder", localKey: "id", foreignKey: "customer", many: true }}
},
"CustomerOrder": {
    table: "customer_order_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "customer": { columnName: "customer", modelName: "customer", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "status": { columnName: "status", modelName: "status", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "orderNumber": { columnName: "order_number", modelName: "order_number", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "orderDate": { columnName: "order_date", modelName: "order_date", logPolicy: "plain", logicalType: "date", decode: "date", nullable: false }, "totalAmount": { columnName: "total_amount", modelName: "total_amount", logPolicy: "plain", logicalType: "decimal", decode: "number", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"customer": { targetEntity: "Customer", localKey: "customer", foreignKey: "id", many: false }, "status": { targetEntity: "OrderStatus", localKey: "status", foreignKey: "id", many: false }, "orderItemList": { targetEntity: "OrderItem", localKey: "id", foreignKey: "customerOrder", many: true }}
},
"OrderItem": {
    table: "order_item_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "customerOrder": { columnName: "customer_order", modelName: "customer_order", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "productName": { columnName: "product_name", modelName: "product_name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "quantity": { columnName: "quantity", modelName: "quantity", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }, "unitPrice": { columnName: "unit_price", modelName: "unit_price", logPolicy: "plain", logicalType: "decimal", decode: "number", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"customerOrder": { targetEntity: "CustomerOrder", localKey: "customerOrder", foreignKey: "id", many: false }}
}
};