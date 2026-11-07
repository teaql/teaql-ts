import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ObjectLocation, RuntimeModule } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";
import { ensureGeneratedBootstrap } from "./generated-bootstrap";

/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
export const GENERATED_WIRE_MODEL_METADATA = Object.freeze({
  profile: "camelCase" as const,
  entities: Object.freeze({
    "CommercePlatform": Object.freeze({
      entityType: "CommercePlatform",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "Customer": Object.freeze({
      entityType: "Customer",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "email": Object.freeze({ canonicalName: "email", wireName: "email", aliases: Object.freeze([] as string[]) }),
        "commerce_platform": Object.freeze({ canonicalName: "commerce_platform", wireName: "commercePlatform", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "OrderStatus": Object.freeze({
      entityType: "OrderStatus",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "code": Object.freeze({ canonicalName: "code", wireName: "code", aliases: Object.freeze([] as string[]) }),
        "color": Object.freeze({ canonicalName: "color", wireName: "color", aliases: Object.freeze([] as string[]) }),
        "display_order": Object.freeze({ canonicalName: "display_order", wireName: "displayOrder", aliases: Object.freeze([] as string[]) }),
        "commerce_platform": Object.freeze({ canonicalName: "commerce_platform", wireName: "commercePlatform", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "CustomerOrder": Object.freeze({
      entityType: "CustomerOrder",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "order_number": Object.freeze({ canonicalName: "order_number", wireName: "orderNumber", aliases: Object.freeze([] as string[]) }),
        "order_date": Object.freeze({ canonicalName: "order_date", wireName: "orderDate", aliases: Object.freeze([] as string[]) }),
        "total_amount": Object.freeze({ canonicalName: "total_amount", wireName: "totalAmount", aliases: Object.freeze([] as string[]) }),
        "status": Object.freeze({ canonicalName: "status", wireName: "status", aliases: Object.freeze([] as string[]) }),
        "customer": Object.freeze({ canonicalName: "customer", wireName: "customer", aliases: Object.freeze([] as string[]) }),
        "commerce_platform": Object.freeze({ canonicalName: "commerce_platform", wireName: "commercePlatform", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "Product": Object.freeze({
      entityType: "Product",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "sku": Object.freeze({ canonicalName: "sku", wireName: "sku", aliases: Object.freeze([] as string[]) }),
        "image_url": Object.freeze({ canonicalName: "image_url", wireName: "imageUrl", aliases: Object.freeze([] as string[]) }),
        "commerce_platform": Object.freeze({ canonicalName: "commerce_platform", wireName: "commercePlatform", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "OrderLine": Object.freeze({
      entityType: "OrderLine",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "customer_order": Object.freeze({ canonicalName: "customer_order", wireName: "customerOrder", aliases: Object.freeze([] as string[]) }),
        "product": Object.freeze({ canonicalName: "product", wireName: "product", aliases: Object.freeze([] as string[]) }),
        "product_name": Object.freeze({ canonicalName: "product_name", wireName: "productName", aliases: Object.freeze([] as string[]) }),
        "sku": Object.freeze({ canonicalName: "sku", wireName: "sku", aliases: Object.freeze([] as string[]) }),
        "quantity": Object.freeze({ canonicalName: "quantity", wireName: "quantity", aliases: Object.freeze([] as string[]) }),
        "commerce_platform": Object.freeze({ canonicalName: "commerce_platform", wireName: "commercePlatform", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "OrderSearchPreset": Object.freeze({
      entityType: "OrderSearchPreset",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "filter_json": Object.freeze({ canonicalName: "filter_json", wireName: "filterJson", aliases: Object.freeze([] as string[]) }),
        "request_id": Object.freeze({ canonicalName: "request_id", wireName: "requestId", aliases: Object.freeze([] as string[]) }),
        "owner_user_id": Object.freeze({ canonicalName: "owner_user_id", wireName: "ownerUserId", aliases: Object.freeze([] as string[]) }),
        "commerce_platform": Object.freeze({ canonicalName: "commerce_platform", wireName: "commercePlatform", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "CommercePlatform": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "CommercePlatform", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "CommercePlatform", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }
      if (mutation.action === "Update") {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "CommercePlatform", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  },
  "Customer": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "Customer", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "Customer", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }
      if (mutation.action === "Update") {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "Customer", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["email"] === undefined) || mutation.payload["email"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("email") });
      if (mutation.payload["email"] != null && [...String(mutation.payload["email"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("email"), inputValue: mutation.payload["email"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["commerce_platform"] === undefined) || mutation.payload["commerce_platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("commerce_platform") });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  },
  "OrderStatus": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["code"] === undefined) || mutation.payload["code"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("code") });
      if (mutation.payload["code"] != null && [...String(mutation.payload["code"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("code"), inputValue: mutation.payload["code"], systemValue: 100 });

      if (mutation.payload["color"] != null && [...String(mutation.payload["color"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("color"), inputValue: mutation.payload["color"], systemValue: 100 });


      if ((mutation.action === "Create" && mutation.payload["commerce_platform"] === undefined) || mutation.payload["commerce_platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("commerce_platform") });


    },
  },
  "CustomerOrder": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "CustomerOrder", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "CustomerOrder", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }
      if (mutation.action === "Update") {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "CustomerOrder", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["order_number"] === undefined) || mutation.payload["order_number"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("order_number") });
      if (mutation.payload["order_number"] != null && [...String(mutation.payload["order_number"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("order_number"), inputValue: mutation.payload["order_number"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["order_date"] === undefined) || mutation.payload["order_date"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("order_date") });

      if ((mutation.action === "Create" && mutation.payload["total_amount"] === undefined) || mutation.payload["total_amount"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("total_amount") });

      if ((mutation.action === "Create" && mutation.payload["status"] === undefined) || mutation.payload["status"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("status") });

      if ((mutation.action === "Create" && mutation.payload["customer"] === undefined) || mutation.payload["customer"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("customer") });

      if ((mutation.action === "Create" && mutation.payload["commerce_platform"] === undefined) || mutation.payload["commerce_platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("commerce_platform") });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  },
  "Product": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "Product", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "Product", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }
      if (mutation.action === "Update") {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "Product", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["sku"] === undefined) || mutation.payload["sku"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("sku") });
      if (mutation.payload["sku"] != null && [...String(mutation.payload["sku"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("sku"), inputValue: mutation.payload["sku"], systemValue: 100 });

      if (mutation.payload["image_url"] != null && [...String(mutation.payload["image_url"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("image_url"), inputValue: mutation.payload["image_url"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["commerce_platform"] === undefined) || mutation.payload["commerce_platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("commerce_platform") });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  },
  "OrderLine": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "OrderLine", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["customer_order"] === undefined) || mutation.payload["customer_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("customer_order") });

      if ((mutation.action === "Create" && mutation.payload["product"] === undefined) || mutation.payload["product"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("product") });

      if ((mutation.action === "Create" && mutation.payload["product_name"] === undefined) || mutation.payload["product_name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("product_name") });
      if (mutation.payload["product_name"] != null && [...String(mutation.payload["product_name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("product_name"), inputValue: mutation.payload["product_name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["sku"] === undefined) || mutation.payload["sku"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("sku") });
      if (mutation.payload["sku"] != null && [...String(mutation.payload["sku"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("sku"), inputValue: mutation.payload["sku"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["quantity"] === undefined) || mutation.payload["quantity"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("quantity") });

      if ((mutation.action === "Create" && mutation.payload["commerce_platform"] === undefined) || mutation.payload["commerce_platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("commerce_platform") });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });


    },
  },
  "OrderSearchPreset": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "OrderSearchPreset", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "OrderSearchPreset", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }
      if (mutation.action === "Update") {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "OrderSearchPreset", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["filter_json"] === undefined) || mutation.payload["filter_json"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("filter_json") });
      if (mutation.payload["filter_json"] != null && [...String(mutation.payload["filter_json"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("filter_json"), inputValue: mutation.payload["filter_json"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["request_id"] === undefined) || mutation.payload["request_id"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("request_id") });
      if (mutation.payload["request_id"] != null && [...String(mutation.payload["request_id"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("request_id"), inputValue: mutation.payload["request_id"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["owner_user_id"] === undefined) || mutation.payload["owner_user_id"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("owner_user_id") });
      if (mutation.payload["owner_user_id"] != null && [...String(mutation.payload["owner_user_id"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("owner_user_id"), inputValue: mutation.payload["owner_user_id"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["commerce_platform"] === undefined) || mutation.payload["commerce_platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("commerce_platform") });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "CommercePlatform", id: "1", values: { "name": "Northwind Demo", "createTime": "createTime()", "updateTime": "updateTime()" } },
  constants: [
    { entity: "OrderStatus", id: "1001", values: { "name": "Pending", "code": "PENDING", "color": "#F59E0B", "displayOrder": decimal("1"), "commercePlatform": "1" } },
    { entity: "OrderStatus", id: "1002", values: { "name": "Confirmed", "code": "CONFIRMED", "color": "#10B981", "displayOrder": decimal("2"), "commercePlatform": "1" } }
  ]
}, ensure: ensureGeneratedBootstrap });