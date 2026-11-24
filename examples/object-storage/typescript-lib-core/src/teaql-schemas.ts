import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"CommercePlatform": {
    table: "commerce_platform_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"customerOrderList": { targetEntity: "CustomerOrder", localKey: "id", foreignKey: "commercePlatform", many: true }}
},
"CustomerOrder": {
    table: "customer_order_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "orderNumber": { columnName: "order_number", modelName: "order_number", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "commercePlatform": { columnName: "commerce_platform", modelName: "commerce_platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"commercePlatform": { targetEntity: "CommercePlatform", localKey: "commercePlatform", foreignKey: "id", many: false }, "orderAttachmentList": { targetEntity: "OrderAttachment", localKey: "id", foreignKey: "customerOrder", many: true }}
},
"OrderAttachment": {
    table: "order_attachment_data",
    auditMaskFields: ["object_key"],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "customerOrder": { columnName: "customer_order", modelName: "customer_order", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "fileName": { columnName: "file_name", modelName: "file_name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "contentType": { columnName: "content_type", modelName: "content_type", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "contentLength": { columnName: "content_length", modelName: "content_length", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false, integer32: true }, "contentSha256": { columnName: "content_sha256", modelName: "content_sha256", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "objectKey": { columnName: "object_key", modelName: "object_key", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"customerOrder": { targetEntity: "CustomerOrder", localKey: "customerOrder", foreignKey: "id", many: false }}
}
};