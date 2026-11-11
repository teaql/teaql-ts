import type { GeneratedSearchModel } from "teaql-ts";

/** Generated trusted naming/type metadata. No query execution or authorization lives here. */
export const GENERATED_SEARCH_MODELS: Readonly<Record<string, GeneratedSearchModel>> = Object.freeze({
  "Catalog": Object.freeze({
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
      "entryList": "Entry",
    }),
  }),
  "Entry": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "catalog": "integer" as const,
     "name": "string" as const,
     "born_at": "timestamp" as const,
     "bornAt": "timestamp" as const,
     "touched_at": "timestamp" as const,
     "touchedAt": "timestamp" as const,
     "source_ip": "string" as const,
     "sourceIp": "string" as const,
     "last_ip": "string" as const,
     "lastIp": "string" as const,
     "opened_by": "string" as const,
     "openedBy": "string" as const,
     "changed_by": "string" as const,
     "changedBy": "string" as const,
     "guarded_token": "string" as const,
     "guardedToken": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "catalog": "catalog",
     "name": "name",
     "born_at": "bornAt",
     "bornAt": "bornAt",
     "touched_at": "touchedAt",
     "touchedAt": "touchedAt",
     "source_ip": "sourceIp",
     "sourceIp": "sourceIp",
     "last_ip": "lastIp",
     "lastIp": "lastIp",
     "opened_by": "openedBy",
     "openedBy": "openedBy",
     "changed_by": "changedBy",
     "changedBy": "changedBy",
     "guarded_token": "guardedToken",
     "guardedToken": "guardedToken",
     "version": "version",
    }),
    relations: Object.freeze({
     "catalog": "Catalog",
    }),
  }),
});