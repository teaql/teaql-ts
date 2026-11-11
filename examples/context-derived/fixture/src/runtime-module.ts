import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ContextFix, ObjectLocation, RuntimeModule } from "teaql-ts";
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
        "source_ip": Object.freeze({ canonicalName: "source_ip", wireName: "sourceIp", aliases: Object.freeze([] as string[]) }),
        "last_ip": Object.freeze({ canonicalName: "last_ip", wireName: "lastIp", aliases: Object.freeze([] as string[]) }),
        "opened_by": Object.freeze({ canonicalName: "opened_by", wireName: "openedBy", aliases: Object.freeze([] as string[]) }),
        "changed_by": Object.freeze({ canonicalName: "changed_by", wireName: "changedBy", aliases: Object.freeze([] as string[]) }),
        "guarded_token": Object.freeze({ canonicalName: "guarded_token", wireName: "guardedToken", aliases: Object.freeze([] as string[]) }),
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





      if (mutation.action === "Create") {
        ContextFix.apply(context, mutation, "guarded_token", "uniStr", [""]);
      }


      if ((mutation.action === "Create" && mutation.payload["catalog"] === undefined) || mutation.payload["catalog"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("catalog") });

      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["born_at"] === undefined) || mutation.payload["born_at"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("born_at") });

      if ((mutation.action === "Create" && mutation.payload["touched_at"] === undefined) || mutation.payload["touched_at"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("touched_at") });

      if ((mutation.action === "Create" && mutation.payload["source_ip"] === undefined) || mutation.payload["source_ip"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("source_ip") });
      if (mutation.payload["source_ip"] != null && [...String(mutation.payload["source_ip"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("source_ip"), inputValue: mutation.payload["source_ip"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["last_ip"] === undefined) || mutation.payload["last_ip"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("last_ip") });
      if (mutation.payload["last_ip"] != null && [...String(mutation.payload["last_ip"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("last_ip"), inputValue: mutation.payload["last_ip"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["opened_by"] === undefined) || mutation.payload["opened_by"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("opened_by") });
      if (mutation.payload["opened_by"] != null && [...String(mutation.payload["opened_by"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("opened_by"), inputValue: mutation.payload["opened_by"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["changed_by"] === undefined) || mutation.payload["changed_by"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("changed_by") });
      if (mutation.payload["changed_by"] != null && [...String(mutation.payload["changed_by"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("changed_by"), inputValue: mutation.payload["changed_by"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["guarded_token"] === undefined) || mutation.payload["guarded_token"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("guarded_token") });
      if (mutation.payload["guarded_token"] != null && [...String(mutation.payload["guarded_token"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("guarded_token"), inputValue: mutation.payload["guarded_token"], systemValue: 100 });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Catalog", id: "1", values: { "name": "Catalog" } },
  constants: []
}, ensure: ensureGeneratedBootstrap });