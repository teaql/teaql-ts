import { EntitySchema } from "teaql-ts/sql/core";

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
"Platform": {
    table: "platform_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "founded": { columnName: "founded", modelName: "founded", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "userEmail": { columnName: "user_email", modelName: "user_email", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"taskStatusList": { targetEntity: "TaskStatus", localKey: "id", foreignKey: "platform", many: true }, "taskList": { targetEntity: "Task", localKey: "id", foreignKey: "platform", many: true }}
},
"TaskStatus": {
    table: "task_status_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "code": { columnName: "code", modelName: "code", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "color": { columnName: "color", modelName: "color", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "displayOrder": { columnName: "display_order", modelName: "display_order", logPolicy: "plain", logicalType: "decimal", decode: "decimal", nullable: false }, "progress": { columnName: "progress", modelName: "progress", logPolicy: "plain", logicalType: "decimal", decode: "decimal", nullable: false }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "taskList": { targetEntity: "Task", localKey: "id", foreignKey: "status", many: true }}
},
"Task": {
    table: "task_data",
    auditMaskFields: [],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "status": { columnName: "status", modelName: "status", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"status": { targetEntity: "TaskStatus", localKey: "status", foreignKey: "id", many: false }, "platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "taskExecutionLogList": { targetEntity: "TaskExecutionLog", localKey: "id", foreignKey: "task", many: true }}
},
"TaskExecutionLog": {
    table: "task_execution_log_data",
    auditMaskFields: ["detail"],
    columns: {"id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "task": { columnName: "task", modelName: "task", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "action": { columnName: "action", modelName: "action", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "detail": { columnName: "detail", modelName: "detail", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }},
    relations: {"task": { targetEntity: "Task", localKey: "task", foreignKey: "id", many: false }}
}
};