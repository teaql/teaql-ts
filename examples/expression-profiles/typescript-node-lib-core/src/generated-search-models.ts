import type { GeneratedSearchModel } from "teaql-ts";

/** Generated trusted naming/type metadata. No query execution or authorization lives here. */
export const GENERATED_SEARCH_MODELS: Readonly<Record<string, GeneratedSearchModel>> = Object.freeze({
  "DistributionCenter": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "dock_name": "string" as const,
     "dockName": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "dock_name": "dockName",
     "dockName": "dockName",
     "version": "version",
    }),
    relations: Object.freeze({
      "dispatchOrderList": "DispatchOrder",
    }),
  }),
  "DispatchOrder": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "distribution_center": "integer" as const,
     "distributionCenter": "integer" as const,
     "order_reference": "string" as const,
     "orderReference": "string" as const,
     "handling_note": "string" as const,
     "handlingNote": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "distribution_center": "distributionCenter",
     "distributionCenter": "distributionCenter",
     "order_reference": "orderReference",
     "orderReference": "orderReference",
     "handling_note": "handlingNote",
     "handlingNote": "handlingNote",
     "version": "version",
    }),
    relations: Object.freeze({
     "distribution_center": "DistributionCenter",
     "distributionCenter": "DistributionCenter",
    }),
  }),
});