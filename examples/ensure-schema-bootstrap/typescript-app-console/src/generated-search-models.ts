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
      "schoolTypeList": "SchoolType",
      "schoolList": "School",
    }),
  }),
  "SchoolType": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "platform": "integer" as const,
     "name": "string" as const,
     "code": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "platform": "platform",
     "name": "name",
     "code": "code",
     "version": "version",
    }),
    relations: Object.freeze({
     "platform": "Platform",
      "schoolList": "School",
    }),
  }),
  "School": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "platform": "integer" as const,
     "school_type": "integer" as const,
     "schoolType": "integer" as const,
     "name": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "platform": "platform",
     "school_type": "schoolType",
     "schoolType": "schoolType",
     "name": "name",
     "version": "version",
    }),
    relations: Object.freeze({
     "platform": "Platform",
     "school_type": "SchoolType",
     "schoolType": "SchoolType",
    }),
  }),
});