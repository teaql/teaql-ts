import type { GeneratedSearchModel } from "teaql-ts";

/** Generated trusted naming/type metadata. No query execution or authorization lives here. */
export const GENERATED_SEARCH_MODELS: Readonly<Record<string, GeneratedSearchModel>> = Object.freeze({
  "Platform": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "name": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "name": "name",
     "version": "version",
    }),
    relations: Object.freeze({
      "workItemList": "WorkItem",
    }),
  }),
  "WorkItem": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "title": "string" as const,
     "description": "string" as const,
     "platform": "integer" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "title": "title",
     "description": "description",
     "platform": "platform",
     "version": "version",
    }),
    relations: Object.freeze({
     "platform": "Platform",
    }),
  }),
});