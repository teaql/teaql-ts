import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"customerOrderList": { targetEntity: "CustomerOrder", localKey: "id", foreignKey: "platform", many: true }}
},
"CustomerOrder": {
    table: "customer_order_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "orderNumber": { columnName: "order_number", modelName: "order_number", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "description": { columnName: "description", modelName: "description", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "orderItemList": { targetEntity: "OrderItem", localKey: "id", foreignKey: "customerOrder", many: true }, "paymentList": { targetEntity: "Payment", localKey: "id", foreignKey: "customerOrder", many: true }, "shipmentList": { targetEntity: "Shipment", localKey: "id", foreignKey: "customerOrder", many: true }}
},
"OrderItem": {
    table: "order_item_data",
    auditMaskFields: ["name"],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "customerOrder": { columnName: "customer_order", modelName: "customer_order", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"customerOrder": { targetEntity: "CustomerOrder", localKey: "customerOrder", foreignKey: "id", many: false }}
},
"Payment": {
    table: "payment_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "customerOrder": { columnName: "customer_order", modelName: "customer_order", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "referenceCode": { columnName: "reference_code", modelName: "reference_code", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"customerOrder": { targetEntity: "CustomerOrder", localKey: "customerOrder", foreignKey: "id", many: false }, "paymentAttemptList": { targetEntity: "PaymentAttempt", localKey: "id", foreignKey: "payment", many: true }}
},
"PaymentAttempt": {
    table: "payment_attempt_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "payment": { columnName: "payment", modelName: "payment", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "referenceCode": { columnName: "reference_code", modelName: "reference_code", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"payment": { targetEntity: "Payment", localKey: "payment", foreignKey: "id", many: false }}
},
"Shipment": {
    table: "shipment_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "customerOrder": { columnName: "customer_order", modelName: "customer_order", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "referenceCode": { columnName: "reference_code", modelName: "reference_code", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"customerOrder": { targetEntity: "CustomerOrder", localKey: "customerOrder", foreignKey: "id", many: false }}
}
};