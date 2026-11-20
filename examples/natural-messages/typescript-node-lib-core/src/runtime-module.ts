import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ContextFix, ObjectLocation, RuntimeModule } from "teaql-ts";
import { CheckerPresentationModel } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";
import { ensureGeneratedBootstrap } from "./generated-bootstrap";

/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
export const GENERATED_WIRE_MODEL_METADATA = Object.freeze({
  profile: "camelCase" as const,
  entities: Object.freeze({
    "Catalog": Object.freeze({
      entityType: "Catalog",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "Entry": Object.freeze({
      entityType: "Entry",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "catalog": Object.freeze({ canonicalName: "catalog", wireName: "catalog", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "born_at": Object.freeze({ canonicalName: "born_at", wireName: "bornAt", aliases: Object.freeze([] as string[]) }),
        "touched_at": Object.freeze({ canonicalName: "touched_at", wireName: "touchedAt", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "Catalog": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });


    },
  },
  "Entry": {
    checkAndFix(context, mutation, results) {
      if (mutation.action === "Create") {
        ContextFix.apply(context, mutation, "born_at", "now", []);
      }

      if (mutation.action === "Create") {
        ContextFix.apply(context, mutation, "touched_at", "now", []);
      }
      if (mutation.action === "Update") {
        ContextFix.apply(context, mutation, "touched_at", "now", []);
      }


      if ((mutation.action === "Create" && mutation.payload["catalog"] === undefined) || mutation.payload["catalog"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("catalog") });

      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["born_at"] === undefined) || mutation.payload["born_at"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("born_at") });

      if ((mutation.action === "Create" && mutation.payload["touched_at"] === undefined) || mutation.payload["touched_at"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("touched_at") });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Catalog", id: "1", values: { "name": "Catalog" } },
  constants: []
}, ensure: ensureGeneratedBootstrap }).withCheckerPresentation(CheckerPresentationModel.fromJson("{\"schema\":\"teaql.checker-model/v1\",\"revision\":\"sha256:6499e0ef58931c3d57f98303285ad7d8cc498b658a8be72890e0431a6e158a25\",\"entities\":{\"Catalog\":{\"labels\":{\"en\":\"catalog\",\"zh-CN\":\"目录\"},\"fields\":[{\"name\":\"entry_list\",\"targetType\":\"Entry\",\"labels\":{\"en\":\"entry\",\"zh-CN\":\"明细\"},\"aliases\":[\"EntryList\",\"entryList\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\",\"zh-CN\":\"名称\"},\"aliases\":[\"Name\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]},\"Entry\":{\"labels\":{\"en\":\"entry\",\"zh-CN\":\"明细\"},\"fields\":[{\"name\":\"born_at\",\"labels\":{\"en\":\"born at\"},\"aliases\":[\"BornAt\",\"bornAt\"]},{\"name\":\"catalog\",\"targetType\":\"Catalog\",\"labels\":{\"en\":\"catalog\",\"zh-CN\":\"目录\"},\"aliases\":[\"Catalog\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\",\"zh-CN\":\"名称\"},\"aliases\":[\"Name\"]},{\"name\":\"touched_at\",\"labels\":{\"en\":\"touched at\"},\"aliases\":[\"TouchedAt\",\"touchedAt\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]}}}"));