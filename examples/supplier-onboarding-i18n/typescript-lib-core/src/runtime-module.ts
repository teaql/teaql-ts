import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ContextFix, ObjectLocation, RuntimeModule } from "teaql-ts";
import { CheckerPresentationModel } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-schemas";
import { ensureGeneratedBootstrap } from "./generated-bootstrap";

/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
export const GENERATED_WIRE_MODEL_METADATA = Object.freeze({
  profile: "camelCase" as const,
  entities: Object.freeze({
    "Warehouse": Object.freeze({
      entityType: "Warehouse",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "Supplier": Object.freeze({
      entityType: "Supplier",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "warehouse": Object.freeze({ canonicalName: "warehouse", wireName: "warehouse", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "minimum_order_quantity": Object.freeze({ canonicalName: "minimum_order_quantity", wireName: "minimumOrderQuantity", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "Warehouse": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });


    },
  },
  "Supplier": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["warehouse"] === undefined) || mutation.payload["warehouse"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("warehouse") });

      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && !([...String(mutation.payload["name"])].length >= 1)) results.push({ ruleId: "min_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 1 });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 80) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 80 });

      if ((mutation.action === "Create" && mutation.payload["minimum_order_quantity"] === undefined) || mutation.payload["minimum_order_quantity"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("minimum_order_quantity") });
      if (mutation.payload["minimum_order_quantity"] != null && !(Number(mutation.payload["minimum_order_quantity"]) >= 10)) results.push({ ruleId: "min", location: ObjectLocation.property("minimum_order_quantity"), inputValue: mutation.payload["minimum_order_quantity"], systemValue: 10 });
      if (mutation.payload["minimum_order_quantity"] != null && Number(mutation.payload["minimum_order_quantity"]) > 10000) results.push({ ruleId: "max", location: ObjectLocation.property("minimum_order_quantity"), inputValue: mutation.payload["minimum_order_quantity"], systemValue: 10000 });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Warehouse", id: "1", values: { "name": "Central Warehouse" } },
  constants: []
}, ensure: ensureGeneratedBootstrap }).withCheckerPresentation(CheckerPresentationModel.fromJson("{\"schema\":\"teaql.checker-model/v1\",\"revision\":\"sha256:f4b63b86dd7cad758f18ebc623d0a4976afb15dbe9f61002523f909bb75098b0\",\"entities\":{\"Supplier\":{\"labels\":{\"en\":\"Supplier\",\"zh-CN\":\"供应商\"},\"fields\":[{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"minimum_order_quantity\",\"labels\":{\"en\":\"minimum order quantity\"},\"aliases\":[\"MinimumOrderQuantity\",\"minimumOrderQuantity\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\"},\"aliases\":[\"Name\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]},{\"name\":\"warehouse\",\"targetType\":\"Warehouse\",\"labels\":{\"en\":\"Warehouse\",\"zh-CN\":\"仓库\"},\"aliases\":[\"Warehouse\"]}]},\"Warehouse\":{\"labels\":{\"en\":\"Warehouse\",\"zh-CN\":\"仓库\"},\"fields\":[{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\"},\"aliases\":[\"Name\"]},{\"name\":\"supplier_list\",\"targetType\":\"Supplier\",\"labels\":{\"en\":\"Supplier\",\"zh-CN\":\"供应商\"},\"aliases\":[\"SupplierList\",\"supplierList\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]}}}"));