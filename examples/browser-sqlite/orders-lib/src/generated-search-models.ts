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
      "orderStatusList": "OrderStatus",
      "customerList": "Customer",
    }),
  }),
  "OrderStatus": Object.freeze({
    fields: Object.freeze({
     "platform": "integer" as const,
     "id": "integer" as const,
     "name": "string" as const,
     "code": "string" as const,
     "color": "string" as const,
     "display_order": "integer" as const,
     "displayOrder": "integer" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "platform": "platform",
     "id": "id",
     "name": "name",
     "code": "code",
     "color": "color",
     "display_order": "displayOrder",
     "displayOrder": "displayOrder",
     "version": "version",
    }),
    relations: Object.freeze({
     "platform": "Platform",
      "customerOrderList": "CustomerOrder",
    }),
  }),
  "Customer": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "platform": "integer" as const,
     "name": "string" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "platform": "platform",
     "name": "name",
     "version": "version",
    }),
    relations: Object.freeze({
     "platform": "Platform",
      "customerOrderList": "CustomerOrder",
    }),
  }),
  "CustomerOrder": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "customer": "integer" as const,
     "status": "integer" as const,
     "order_number": "string" as const,
     "orderNumber": "string" as const,
     "order_date": "date" as const,
     "orderDate": "date" as const,
     "total_amount": "decimal" as const,
     "totalAmount": "decimal" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "customer": "customer",
     "status": "status",
     "order_number": "orderNumber",
     "orderNumber": "orderNumber",
     "order_date": "orderDate",
     "orderDate": "orderDate",
     "total_amount": "totalAmount",
     "totalAmount": "totalAmount",
     "version": "version",
    }),
    relations: Object.freeze({
     "customer": "Customer",
     "status": "OrderStatus",
      "orderItemList": "OrderItem",
    }),
  }),
  "OrderItem": Object.freeze({
    fields: Object.freeze({
     "id": "integer" as const,
     "customer_order": "integer" as const,
     "customerOrder": "integer" as const,
     "product_name": "string" as const,
     "productName": "string" as const,
     "quantity": "integer" as const,
     "unit_price": "decimal" as const,
     "unitPrice": "decimal" as const,
     "version": "integer" as const,
    }),
    queryFields: Object.freeze({
     "id": "id",
     "customer_order": "customerOrder",
     "customerOrder": "customerOrder",
     "product_name": "productName",
     "productName": "productName",
     "quantity": "quantity",
     "unit_price": "unitPrice",
     "unitPrice": "unitPrice",
     "version": "version",
    }),
    relations: Object.freeze({
     "customer_order": "CustomerOrder",
     "customerOrder": "CustomerOrder",
    }),
  }),
});