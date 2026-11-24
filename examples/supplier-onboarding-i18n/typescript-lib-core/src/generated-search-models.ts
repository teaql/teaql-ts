import type { GeneratedSearchModel } from "teaql-ts";

/** Generated trusted naming/type metadata. No query execution or authorization lives here. */
export const GENERATED_SEARCH_MODELS: Readonly<Record<string, GeneratedSearchModel>> = Object.freeze({
  "Warehouse": Object.freeze({
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
      "supplierList": "Supplier",
    }),
  }),
  "Supplier": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "warehouse": "integer" as const,
     "name": "string" as const,
     "minimum_order_quantity": "integer" as const,
     "minimumOrderQuantity": "integer" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "warehouse": "warehouse",
     "name": "name",
     "minimum_order_quantity": "minimumOrderQuantity",
     "minimumOrderQuantity": "minimumOrderQuantity",
     "version": "version",
    }),
    relations: Object.freeze({
     "warehouse": "Warehouse",
    }),
  }),
});