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
      "freightQuoteList": "FreightQuote",
    }),
  }),
  "FreightQuote": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "platform": "integer" as const,
     "reference": "string" as const,
     "amount": "decimal" as const,
     "shipment_number": "integer" as const,
     "shipmentNumber": "integer" as const,
     "package_count": "integer" as const,
     "packageCount": "integer" as const,
     "delivery_date": "date" as const,
     "deliveryDate": "date" as const,
     "pickup_time": "unsupported" as const,
     "pickupTime": "unsupported" as const,
     "quoted_at": "timestamp" as const,
     "quotedAt": "timestamp" as const,
     "instructions": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "platform": "platform",
     "reference": "reference",
     "amount": "amount",
     "shipment_number": "shipmentNumber",
     "shipmentNumber": "shipmentNumber",
     "package_count": "packageCount",
     "packageCount": "packageCount",
     "delivery_date": "deliveryDate",
     "deliveryDate": "deliveryDate",
     "pickup_time": "pickupTime",
     "pickupTime": "pickupTime",
     "quoted_at": "quotedAt",
     "quotedAt": "quotedAt",
     "instructions": "instructions",
     "version": "version",
    }),
    relations: Object.freeze({
     "platform": "Platform",
    }),
  }),
});