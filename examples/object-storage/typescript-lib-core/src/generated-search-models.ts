import type { GeneratedSearchModel } from "teaql-ts";

/** Generated trusted naming/type metadata. No query execution or authorization lives here. */
export const GENERATED_SEARCH_MODELS: Readonly<Record<string, GeneratedSearchModel>> = Object.freeze({
  "CommercePlatform": Object.freeze({
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
     "order_number": "string" as const,
     "orderNumber": "string" as const,
     "commerce_platform": "integer" as const,
     "commercePlatform": "integer" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "order_number": "orderNumber",
     "orderNumber": "orderNumber",
     "commerce_platform": "commercePlatform",
     "commercePlatform": "commercePlatform",
     "version": "version",
    }),
    relations: Object.freeze({
     "commerce_platform": "CommercePlatform",
     "commercePlatform": "CommercePlatform",
      "orderAttachmentList": "OrderAttachment",
    }),
  }),
  "OrderAttachment": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "customer_order": "integer" as const,
     "customerOrder": "integer" as const,
     "file_name": "string" as const,
     "fileName": "string" as const,
     "content_type": "string" as const,
     "contentType": "string" as const,
     "content_length": "integer" as const,
     "contentLength": "integer" as const,
     "content_sha256": "string" as const,
     "contentSha256": "string" as const,
     "object_key": "string" as const,
     "objectKey": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "customer_order": "customerOrder",
     "customerOrder": "customerOrder",
     "file_name": "fileName",
     "fileName": "fileName",
     "content_type": "contentType",
     "contentType": "contentType",
     "content_length": "contentLength",
     "contentLength": "contentLength",
     "content_sha256": "contentSha256",
     "contentSha256": "contentSha256",
     "object_key": "objectKey",
     "objectKey": "objectKey",
     "version": "version",
    }),
    relations: Object.freeze({
     "customer_order": "CustomerOrder",
     "customerOrder": "CustomerOrder",
    }),
  }),
});