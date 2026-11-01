import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ObjectLocation, RuntimeModule } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";
import { ensureGeneratedBootstrap } from "./generated-bootstrap";

/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
export const GENERATED_WIRE_MODEL_METADATA = Object.freeze({
  profile: "camelCase" as const,
  entities: Object.freeze({
    "TypePlatform": Object.freeze({
      entityType: "TypePlatform",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "ScalarTypeProbe": Object.freeze({
      entityType: "ScalarTypeProbe",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "type_platform": Object.freeze({ canonicalName: "type_platform", wireName: "typePlatform", aliases: Object.freeze([] as string[]) }),
        "required_string": Object.freeze({ canonicalName: "required_string", wireName: "requiredString", aliases: Object.freeze([] as string[]) }),
        "optional_string": Object.freeze({ canonicalName: "optional_string", wireName: "optionalString", aliases: Object.freeze([] as string[]) }),
        "large_text": Object.freeze({ canonicalName: "large_text", wireName: "largeText", aliases: Object.freeze([] as string[]) }),
        "required_boolean": Object.freeze({ canonicalName: "required_boolean", wireName: "requiredBoolean", aliases: Object.freeze([] as string[]) }),
        "optional_boolean": Object.freeze({ canonicalName: "optional_boolean", wireName: "optionalBoolean", aliases: Object.freeze([] as string[]) }),
        "required_integer": Object.freeze({ canonicalName: "required_integer", wireName: "requiredInteger", aliases: Object.freeze([] as string[]) }),
        "optional_integer": Object.freeze({ canonicalName: "optional_integer", wireName: "optionalInteger", aliases: Object.freeze([] as string[]) }),
        "required_long": Object.freeze({ canonicalName: "required_long", wireName: "requiredLong", aliases: Object.freeze([] as string[]) }),
        "optional_long": Object.freeze({ canonicalName: "optional_long", wireName: "optionalLong", aliases: Object.freeze([] as string[]) }),
        "required_decimal": Object.freeze({ canonicalName: "required_decimal", wireName: "requiredDecimal", aliases: Object.freeze([] as string[]) }),
        "optional_decimal": Object.freeze({ canonicalName: "optional_decimal", wireName: "optionalDecimal", aliases: Object.freeze([] as string[]) }),
        "required_float": Object.freeze({ canonicalName: "required_float", wireName: "requiredFloat", aliases: Object.freeze([] as string[]) }),
        "optional_float": Object.freeze({ canonicalName: "optional_float", wireName: "optionalFloat", aliases: Object.freeze([] as string[]) }),
        "required_double": Object.freeze({ canonicalName: "required_double", wireName: "requiredDouble", aliases: Object.freeze([] as string[]) }),
        "optional_double": Object.freeze({ canonicalName: "optional_double", wireName: "optionalDouble", aliases: Object.freeze([] as string[]) }),
        "required_date": Object.freeze({ canonicalName: "required_date", wireName: "requiredDate", aliases: Object.freeze([] as string[]) }),
        "optional_date": Object.freeze({ canonicalName: "optional_date", wireName: "optionalDate", aliases: Object.freeze([] as string[]) }),
        "required_time": Object.freeze({ canonicalName: "required_time", wireName: "requiredTime", aliases: Object.freeze([] as string[]) }),
        "optional_time": Object.freeze({ canonicalName: "optional_time", wireName: "optionalTime", aliases: Object.freeze([] as string[]) }),
        "required_datetime": Object.freeze({ canonicalName: "required_datetime", wireName: "requiredDatetime", aliases: Object.freeze([] as string[]) }),
        "optional_datetime": Object.freeze({ canonicalName: "optional_datetime", wireName: "optionalDatetime", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "TypePlatform": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });


    },
  },
  "ScalarTypeProbe": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
        mutation.payload["create_time"] = now;
        context.recordFixEvidence({ entityType: "ScalarTypeProbe", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
      }

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "ScalarTypeProbe", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }
      if (mutation.action === "Update") {
        mutation.payload["update_time"] = now;
        context.recordFixEvidence({ entityType: "ScalarTypeProbe", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
      }


      if ((mutation.action === "Create" && mutation.payload["type_platform"] === undefined) || mutation.payload["type_platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("type_platform") });

      if ((mutation.action === "Create" && mutation.payload["required_string"] === undefined) || mutation.payload["required_string"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_string") });
      if (mutation.payload["required_string"] != null && [...String(mutation.payload["required_string"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("required_string"), inputValue: mutation.payload["required_string"], systemValue: 100 });

      if (mutation.payload["optional_string"] != null && [...String(mutation.payload["optional_string"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("optional_string"), inputValue: mutation.payload["optional_string"], systemValue: 100 });


      if ((mutation.action === "Create" && mutation.payload["required_boolean"] === undefined) || mutation.payload["required_boolean"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_boolean") });


      if ((mutation.action === "Create" && mutation.payload["required_integer"] === undefined) || mutation.payload["required_integer"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_integer") });


      if ((mutation.action === "Create" && mutation.payload["required_long"] === undefined) || mutation.payload["required_long"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_long") });


      if ((mutation.action === "Create" && mutation.payload["required_decimal"] === undefined) || mutation.payload["required_decimal"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_decimal") });


      if ((mutation.action === "Create" && mutation.payload["required_float"] === undefined) || mutation.payload["required_float"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_float") });


      if ((mutation.action === "Create" && mutation.payload["required_double"] === undefined) || mutation.payload["required_double"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_double") });


      if ((mutation.action === "Create" && mutation.payload["required_date"] === undefined) || mutation.payload["required_date"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_date") });


      if ((mutation.action === "Create" && mutation.payload["required_time"] === undefined) || mutation.payload["required_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_time") });


      if ((mutation.action === "Create" && mutation.payload["required_datetime"] === undefined) || mutation.payload["required_datetime"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("required_datetime") });


      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "TypePlatform", id: "1", values: { "name": "Scalar Type Conformance" } },
  constants: []
}, ensure: ensureGeneratedBootstrap });