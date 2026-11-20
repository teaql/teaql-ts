import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"DistributionCenter": {
    table: "distribution_center_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "dockName": { columnName: "dock_name", modelName: "dock_name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"dispatchOrderList": { targetEntity: "DispatchOrder", localKey: "id", foreignKey: "distributionCenter", many: true }}
},
"DispatchOrder": {
    table: "dispatch_order_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "distributionCenter": { columnName: "distribution_center", modelName: "distribution_center", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "orderReference": { columnName: "order_reference", modelName: "order_reference", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "handlingNote": { columnName: "handling_note", modelName: "handling_note", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"distributionCenter": { targetEntity: "DistributionCenter", localKey: "distributionCenter", foreignKey: "id", many: false }}
}
};