import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"freightQuoteList": { targetEntity: "FreightQuote", localKey: "id", foreignKey: "platform", many: true }}
},
"FreightQuote": {
    table: "freight_quote_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "reference": { columnName: "reference", modelName: "reference", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "amount": { columnName: "amount", modelName: "amount", logPolicy: "plain", logicalType: "decimal", decode: "decimal", nullable: false }, "shipmentNumber": { columnName: "shipment_number", modelName: "shipment_number", logPolicy: "plain", logicalType: "long", decode: "long", nullable: false }, "packageCount": { columnName: "package_count", modelName: "package_count", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false, integer32: true }, "deliveryDate": { columnName: "delivery_date", modelName: "delivery_date", logPolicy: "plain", logicalType: "date", decode: "date", nullable: false }, "pickupTime": { columnName: "pickup_time", modelName: "pickup_time", logPolicy: "plain", logicalType: "time", decode: "time", nullable: false }, "quotedAt": { columnName: "quoted_at", modelName: "quoted_at", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "instructions": { columnName: "instructions", modelName: "instructions", logPolicy: "plain", logicalType: "text", decode: "native", nullable: true }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }}
}
};