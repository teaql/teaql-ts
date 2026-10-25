import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ObjectLocation, RuntimeModule } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";
import { ensureGeneratedBootstrap } from "./generated-bootstrap";

/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
export const GENERATED_WIRE_MODEL_METADATA = Object.freeze({
  profile: "camelCase" as const,
  entities: Object.freeze({
    "Tenant": Object.freeze({
      entityType: "Tenant",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "PurchaseOrder": Object.freeze({
      entityType: "PurchaseOrder",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "tenant": Object.freeze({ canonicalName: "tenant", wireName: "tenant", aliases: Object.freeze([] as string[]) }),
        "contact_phone": Object.freeze({ canonicalName: "contact_phone", wireName: "contactPhone", aliases: Object.freeze([] as string[]) }),
        "internal_note": Object.freeze({ canonicalName: "internal_note", wireName: "internalNote", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "OrderItem": Object.freeze({
      entityType: "OrderItem",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "purchase_order": Object.freeze({ canonicalName: "purchase_order", wireName: "purchaseOrder", aliases: Object.freeze([] as string[]) }),
        "tenant": Object.freeze({ canonicalName: "tenant", wireName: "tenant", aliases: Object.freeze([] as string[]) }),
        "product_name": Object.freeze({ canonicalName: "product_name", wireName: "productName", aliases: Object.freeze([] as string[]) }),
        "unit_price": Object.freeze({ canonicalName: "unit_price", wireName: "unitPrice", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "Tenant": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && !([...String(mutation.payload["name"])].length >= 1)) results.push({ ruleId: "min_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 1 });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 80) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 80 });


    },
  },
  "PurchaseOrder": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create") {
        const root = context.requireActiveRoot("Tenant");
        const supplied = mutation.payload["tenant"]?.id ?? mutation.payload["tenant"];
        if (supplied == null) {
          mutation.payload["tenant"] = root.id;
          context.recordFixEvidence({ entityType: "PurchaseOrder", modelPath: "tenant", source: "context", sourceLabel: "activeRoot:Tenant" });
        }
        else if (String(supplied) !== String(root.id)) results.push({ ruleId: "context_root_mismatch", location: ObjectLocation.property("tenant"), inputValue: supplied, systemValue: root.id });
      } else if (mutation.action === "Update" && mutation.payload["tenant"] != null) {
        const root = context.requireActiveRoot("Tenant");
        const supplied = mutation.payload["tenant"]?.id ?? mutation.payload["tenant"];
        if (String(supplied) !== String(root.id)) results.push({ ruleId: "context_root_mismatch", location: ObjectLocation.property("tenant"), inputValue: supplied, systemValue: root.id });
      }



      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "PurchaseOrder", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "PurchaseOrder", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }
      if (mutation.action === "Update") {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "PurchaseOrder", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["tenant"] === undefined) || mutation.payload["tenant"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("tenant") });

      if ((mutation.action === "Create" && mutation.payload["contact_phone"] === undefined) || mutation.payload["contact_phone"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("contact_phone") });
      if (mutation.payload["contact_phone"] != null && !([...String(mutation.payload["contact_phone"])].length >= 1)) results.push({ ruleId: "min_length", location: ObjectLocation.property("contact_phone"), inputValue: mutation.payload["contact_phone"], systemValue: 1 });
      if (mutation.payload["contact_phone"] != null && [...String(mutation.payload["contact_phone"])].length > 32) results.push({ ruleId: "max_length", location: ObjectLocation.property("contact_phone"), inputValue: mutation.payload["contact_phone"], systemValue: 32 });

      if (mutation.payload["internal_note"] != null && [...String(mutation.payload["internal_note"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("internal_note"), inputValue: mutation.payload["internal_note"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  },
  "OrderItem": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create") {
        const root = context.requireActiveRoot("Tenant");
        const supplied = mutation.payload["tenant"]?.id ?? mutation.payload["tenant"];
        if (supplied == null) {
          mutation.payload["tenant"] = root.id;
          context.recordFixEvidence({ entityType: "OrderItem", modelPath: "tenant", source: "context", sourceLabel: "activeRoot:Tenant" });
        }
        else if (String(supplied) !== String(root.id)) results.push({ ruleId: "context_root_mismatch", location: ObjectLocation.property("tenant"), inputValue: supplied, systemValue: root.id });
      } else if (mutation.action === "Update" && mutation.payload["tenant"] != null) {
        const root = context.requireActiveRoot("Tenant");
        const supplied = mutation.payload["tenant"]?.id ?? mutation.payload["tenant"];
        if (String(supplied) !== String(root.id)) results.push({ ruleId: "context_root_mismatch", location: ObjectLocation.property("tenant"), inputValue: supplied, systemValue: root.id });
      }



      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "OrderItem", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "OrderItem", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }
      if (mutation.action === "Update") {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "OrderItem", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["purchase_order"] === undefined) || mutation.payload["purchase_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("purchase_order") });

      if ((mutation.action === "Create" && mutation.payload["tenant"] === undefined) || mutation.payload["tenant"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("tenant") });

      if ((mutation.action === "Create" && mutation.payload["product_name"] === undefined) || mutation.payload["product_name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("product_name") });
      if (mutation.payload["product_name"] != null && !([...String(mutation.payload["product_name"])].length >= 1)) results.push({ ruleId: "min_length", location: ObjectLocation.property("product_name"), inputValue: mutation.payload["product_name"], systemValue: 1 });
      if (mutation.payload["product_name"] != null && [...String(mutation.payload["product_name"])].length > 80) results.push({ ruleId: "max_length", location: ObjectLocation.property("product_name"), inputValue: mutation.payload["product_name"], systemValue: 80 });

      if ((mutation.action === "Create" && mutation.payload["unit_price"] === undefined) || mutation.payload["unit_price"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("unit_price") });
      if (mutation.payload["unit_price"] != null && compareDecimals(String(mutation.payload["unit_price"]), "0.01") === -1) results.push({ ruleId: "min", location: ObjectLocation.property("unit_price"), inputValue: mutation.payload["unit_price"], systemValue: 0.01 });
      if (mutation.payload["unit_price"] != null && compareDecimals(String(mutation.payload["unit_price"]), "1000000") > 0) results.push({ ruleId: "max", location: ObjectLocation.property("unit_price"), inputValue: mutation.payload["unit_price"], systemValue: 1000000 });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Tenant", id: "1", values: { "name": "Tenant Name" } },
  constants: []
}, ensure: ensureGeneratedBootstrap });