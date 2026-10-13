import { ObjectLocation, RuntimeModule } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-schemas";
import { ensureGeneratedBootstrap } from "./generated-bootstrap";

/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
export const GENERATED_WIRE_MODEL_METADATA = Object.freeze({
  profile: "camelCase" as const,
  entities: Object.freeze({
    "Platform": Object.freeze({
      entityType: "Platform",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "OrderStatus": Object.freeze({
      entityType: "OrderStatus",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "code": Object.freeze({ canonicalName: "code", wireName: "code", aliases: Object.freeze([] as string[]) }),
        "color": Object.freeze({ canonicalName: "color", wireName: "color", aliases: Object.freeze([] as string[]) }),
        "display_order": Object.freeze({ canonicalName: "display_order", wireName: "displayOrder", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "Customer": Object.freeze({
      entityType: "Customer",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "CustomerOrder": Object.freeze({
      entityType: "CustomerOrder",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "customer": Object.freeze({ canonicalName: "customer", wireName: "customer", aliases: Object.freeze([] as string[]) }),
        "status": Object.freeze({ canonicalName: "status", wireName: "status", aliases: Object.freeze([] as string[]) }),
        "order_number": Object.freeze({ canonicalName: "order_number", wireName: "orderNumber", aliases: Object.freeze([] as string[]) }),
        "order_date": Object.freeze({ canonicalName: "order_date", wireName: "orderDate", aliases: Object.freeze([] as string[]) }),
        "total_amount": Object.freeze({ canonicalName: "total_amount", wireName: "totalAmount", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "OrderItem": Object.freeze({
      entityType: "OrderItem",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "customer_order": Object.freeze({ canonicalName: "customer_order", wireName: "customerOrder", aliases: Object.freeze([] as string[]) }),
        "product_name": Object.freeze({ canonicalName: "product_name", wireName: "productName", aliases: Object.freeze([] as string[]) }),
        "quantity": Object.freeze({ canonicalName: "quantity", wireName: "quantity", aliases: Object.freeze([] as string[]) }),
        "unit_price": Object.freeze({ canonicalName: "unit_price", wireName: "unitPrice", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "Platform": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });


    },
  },
  "OrderStatus": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });


      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["code"] === undefined) || mutation.payload["code"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("code") });
      if (mutation.payload["code"] != null && [...String(mutation.payload["code"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("code"), inputValue: mutation.payload["code"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["color"] === undefined) || mutation.payload["color"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("color") });
      if (mutation.payload["color"] != null && [...String(mutation.payload["color"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("color"), inputValue: mutation.payload["color"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["display_order"] === undefined) || mutation.payload["display_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("display_order") });


    },
  },
  "Customer": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });

      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });


    },
  },
  "CustomerOrder": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["customer"] === undefined) || mutation.payload["customer"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("customer") });

      if ((mutation.action === "Create" && mutation.payload["status"] === undefined) || mutation.payload["status"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("status") });

      if ((mutation.action === "Create" && mutation.payload["order_number"] === undefined) || mutation.payload["order_number"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("order_number") });
      if (mutation.payload["order_number"] != null && [...String(mutation.payload["order_number"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("order_number"), inputValue: mutation.payload["order_number"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["order_date"] === undefined) || mutation.payload["order_date"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("order_date") });

      if ((mutation.action === "Create" && mutation.payload["total_amount"] === undefined) || mutation.payload["total_amount"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("total_amount") });


    },
  },
  "OrderItem": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["customer_order"] === undefined) || mutation.payload["customer_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("customer_order") });

      if ((mutation.action === "Create" && mutation.payload["product_name"] === undefined) || mutation.payload["product_name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("product_name") });
      if (mutation.payload["product_name"] != null && [...String(mutation.payload["product_name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("product_name"), inputValue: mutation.payload["product_name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["quantity"] === undefined) || mutation.payload["quantity"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("quantity") });

      if ((mutation.action === "Create" && mutation.payload["unit_price"] === undefined) || mutation.payload["unit_price"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("unit_price") });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Platform", id: "1", values: { "name": "Commerce Test Platform" } },
  constants: [
    { entity: "OrderStatus", id: "1001", values: { "platform": "1", "name": "New", "code": "NEW", "color": "#94A3B8", "displayOrder": 1 } },
    { entity: "OrderStatus", id: "1002", values: { "platform": "1", "name": "Paid", "code": "PAID", "color": "#22C55E", "displayOrder": 2 } },
    { entity: "OrderStatus", id: "1003", values: { "platform": "1", "name": "Cancelled", "code": "CANCELLED", "color": "#EF4444", "displayOrder": 3 } }
  ]
}, ensure: ensureGeneratedBootstrap });