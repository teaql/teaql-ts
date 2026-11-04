import type { GeneratedSearchModel } from "teaql-ts";

/** Generated trusted naming/type metadata. No query execution or authorization lives here. */
export const GENERATED_SEARCH_MODELS: Readonly<Record<string, GeneratedSearchModel>> = Object.freeze({
  "Platform": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "name": "string" as const,
     "founded": "timestamp" as const,
     "user_email": "string" as const,
     "userEmail": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "name": "name",
     "founded": "founded",
     "user_email": "userEmail",
     "userEmail": "userEmail",
     "version": "version",
    }),
    relations: Object.freeze({
      "taskStatusList": "TaskStatus",
      "taskList": "Task",
    }),
  }),
  "TaskStatus": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "name": "string" as const,
     "code": "string" as const,
     "color": "string" as const,
     "display_order": "decimal" as const,
     "displayOrder": "decimal" as const,
     "progress": "decimal" as const,
     "platform": "integer" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "name": "name",
     "code": "code",
     "color": "color",
     "display_order": "displayOrder",
     "displayOrder": "displayOrder",
     "progress": "progress",
     "platform": "platform",
     "version": "version",
    }),
    relations: Object.freeze({
     "platform": "Platform",
      "taskList": "Task",
    }),
  }),
  "Task": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "name": "string" as const,
     "status": "integer" as const,
     "platform": "integer" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "name": "name",
     "status": "status",
     "platform": "platform",
     "version": "version",
    }),
    relations: Object.freeze({
     "status": "TaskStatus",
     "platform": "Platform",
      "taskExecutionLogList": "TaskExecutionLog",
    }),
  }),
  "TaskExecutionLog": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "task": "integer" as const,
     "action": "string" as const,
     "detail": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "task": "task",
     "action": "action",
     "detail": "detail",
     "version": "version",
    }),
    relations: Object.freeze({
     "task": "Task",
    }),
  }),
});