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
      "customerOrderList": "CustomerOrder",
    }),
  }),
  "CustomerOrder": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "platform": "integer" as const,
     "order_number": "string" as const,
     "orderNumber": "string" as const,
     "description": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "platform": "platform",
     "order_number": "orderNumber",
     "orderNumber": "orderNumber",
     "description": "description",
     "version": "version",
    }),
    relations: Object.freeze({
     "platform": "Platform",
      "orderItemList": "OrderItem",
      "paymentList": "Payment",
      "shipmentList": "Shipment",
    }),
  }),
  "OrderItem": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "customer_order": "integer" as const,
     "customerOrder": "integer" as const,
     "name": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "customer_order": "customerOrder",
     "customerOrder": "customerOrder",
     "name": "name",
     "version": "version",
    }),
    relations: Object.freeze({
     "customer_order": "CustomerOrder",
     "customerOrder": "CustomerOrder",
    }),
  }),
  "Payment": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "customer_order": "integer" as const,
     "customerOrder": "integer" as const,
     "reference_code": "string" as const,
     "referenceCode": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "customer_order": "customerOrder",
     "customerOrder": "customerOrder",
     "reference_code": "referenceCode",
     "referenceCode": "referenceCode",
     "version": "version",
    }),
    relations: Object.freeze({
     "customer_order": "CustomerOrder",
     "customerOrder": "CustomerOrder",
      "paymentAttemptList": "PaymentAttempt",
    }),
  }),
  "PaymentAttempt": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "payment": "integer" as const,
     "reference_code": "string" as const,
     "referenceCode": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "payment": "payment",
     "reference_code": "referenceCode",
     "referenceCode": "referenceCode",
     "version": "version",
    }),
    relations: Object.freeze({
     "payment": "Payment",
    }),
  }),
  "Shipment": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "customer_order": "integer" as const,
     "customerOrder": "integer" as const,
     "reference_code": "string" as const,
     "referenceCode": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "customer_order": "customerOrder",
     "customerOrder": "customerOrder",
     "reference_code": "referenceCode",
     "referenceCode": "referenceCode",
     "version": "version",
    }),
    relations: Object.freeze({
     "customer_order": "CustomerOrder",
     "customerOrder": "CustomerOrder",
    }),
  }),
});