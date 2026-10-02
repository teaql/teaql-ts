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
    "WorkItem": Object.freeze({
      entityType: "WorkItem",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "title": Object.freeze({ canonicalName: "title", wireName: "title", aliases: Object.freeze([] as string[]) }),
        "description": Object.freeze({ canonicalName: "description", wireName: "description", aliases: Object.freeze([] as string[]) }),
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
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
  "WorkItem": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["title"] === undefined) || mutation.payload["title"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("title") });
      if (mutation.payload["title"] != null && !([...String(mutation.payload["title"])].length >= 1)) results.push({ ruleId: "min_length", location: ObjectLocation.property("title"), inputValue: mutation.payload["title"], systemValue: 1 });
      if (mutation.payload["title"] != null && [...String(mutation.payload["title"])].length > 80) results.push({ ruleId: "max_length", location: ObjectLocation.property("title"), inputValue: mutation.payload["title"], systemValue: 80 });

      if (mutation.payload["description"] != null && [...String(mutation.payload["description"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("description"), inputValue: mutation.payload["description"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Platform", id: "1", values: { "name": "Runtime Example" } },
  constants: []
}, ensure: ensureGeneratedBootstrap });