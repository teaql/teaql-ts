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
    "CustomerOrder": Object.freeze({
      entityType: "CustomerOrder",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
        "order_number": Object.freeze({ canonicalName: "order_number", wireName: "orderNumber", aliases: Object.freeze([] as string[]) }),
        "description": Object.freeze({ canonicalName: "description", wireName: "description", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "OrderItem": Object.freeze({
      entityType: "OrderItem",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "customer_order": Object.freeze({ canonicalName: "customer_order", wireName: "customerOrder", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "Payment": Object.freeze({
      entityType: "Payment",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "customer_order": Object.freeze({ canonicalName: "customer_order", wireName: "customerOrder", aliases: Object.freeze([] as string[]) }),
        "reference_code": Object.freeze({ canonicalName: "reference_code", wireName: "referenceCode", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "PaymentAttempt": Object.freeze({
      entityType: "PaymentAttempt",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "payment": Object.freeze({ canonicalName: "payment", wireName: "payment", aliases: Object.freeze([] as string[]) }),
        "reference_code": Object.freeze({ canonicalName: "reference_code", wireName: "referenceCode", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "Shipment": Object.freeze({
      entityType: "Shipment",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "customer_order": Object.freeze({ canonicalName: "customer_order", wireName: "customerOrder", aliases: Object.freeze([] as string[]) }),
        "reference_code": Object.freeze({ canonicalName: "reference_code", wireName: "referenceCode", aliases: Object.freeze([] as string[]) }),
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
  "CustomerOrder": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });

      if ((mutation.action === "Create" && mutation.payload["order_number"] === undefined) || mutation.payload["order_number"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("order_number") });
      if (mutation.payload["order_number"] != null && [...String(mutation.payload["order_number"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("order_number"), inputValue: mutation.payload["order_number"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["description"] === undefined) || mutation.payload["description"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("description") });
      if (mutation.payload["description"] != null && [...String(mutation.payload["description"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("description"), inputValue: mutation.payload["description"], systemValue: 100 });


    },
  },
  "OrderItem": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["customer_order"] === undefined) || mutation.payload["customer_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("customer_order") });

      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });


    },
  },
  "Payment": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["customer_order"] === undefined) || mutation.payload["customer_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("customer_order") });

      if ((mutation.action === "Create" && mutation.payload["reference_code"] === undefined) || mutation.payload["reference_code"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("reference_code") });
      if (mutation.payload["reference_code"] != null && [...String(mutation.payload["reference_code"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("reference_code"), inputValue: mutation.payload["reference_code"], systemValue: 100 });


    },
  },
  "PaymentAttempt": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["payment"] === undefined) || mutation.payload["payment"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("payment") });

      if ((mutation.action === "Create" && mutation.payload["reference_code"] === undefined) || mutation.payload["reference_code"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("reference_code") });
      if (mutation.payload["reference_code"] != null && [...String(mutation.payload["reference_code"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("reference_code"), inputValue: mutation.payload["reference_code"], systemValue: 100 });


    },
  },
  "Shipment": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["customer_order"] === undefined) || mutation.payload["customer_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("customer_order") });

      if ((mutation.action === "Create" && mutation.payload["reference_code"] === undefined) || mutation.payload["reference_code"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("reference_code") });
      if (mutation.payload["reference_code"] != null && [...String(mutation.payload["reference_code"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("reference_code"), inputValue: mutation.payload["reference_code"], systemValue: 100 });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Platform", id: "1", values: { "name": "Trace Chain Verification" } },
  constants: []
}, ensure: ensureGeneratedBootstrap });