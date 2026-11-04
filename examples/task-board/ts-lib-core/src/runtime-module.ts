import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ObjectLocation, RuntimeModule } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";
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
        "founded": Object.freeze({ canonicalName: "founded", wireName: "founded", aliases: Object.freeze([] as string[]) }),
        "user_email": Object.freeze({ canonicalName: "user_email", wireName: "userEmail", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "TaskStatus": Object.freeze({
      entityType: "TaskStatus",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "code": Object.freeze({ canonicalName: "code", wireName: "code", aliases: Object.freeze([] as string[]) }),
        "color": Object.freeze({ canonicalName: "color", wireName: "color", aliases: Object.freeze([] as string[]) }),
        "display_order": Object.freeze({ canonicalName: "display_order", wireName: "displayOrder", aliases: Object.freeze([] as string[]) }),
        "progress": Object.freeze({ canonicalName: "progress", wireName: "progress", aliases: Object.freeze([] as string[]) }),
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "Task": Object.freeze({
      entityType: "Task",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "status": Object.freeze({ canonicalName: "status", wireName: "status", aliases: Object.freeze([] as string[]) }),
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "TaskExecutionLog": Object.freeze({
      entityType: "TaskExecutionLog",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "task": Object.freeze({ canonicalName: "task", wireName: "task", aliases: Object.freeze([] as string[]) }),
        "action": Object.freeze({ canonicalName: "action", wireName: "action", aliases: Object.freeze([] as string[]) }),
        "detail": Object.freeze({ canonicalName: "detail", wireName: "detail", aliases: Object.freeze([] as string[]) }),
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
      if (mutation.action === "Create" && mutation.payload["founded"] == null) {
        mutation.payload["founded"] = now;
        context.recordFixEvidence({ entityType: "Platform", modelPath: "founded", source: "clock", sourceLabel: "graphClock" });
      }



      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["founded"] === undefined) || mutation.payload["founded"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("founded") });

      if ((mutation.action === "Create" && mutation.payload["user_email"] === undefined) || mutation.payload["user_email"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("user_email") });
      if (mutation.payload["user_email"] != null && [...String(mutation.payload["user_email"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("user_email"), inputValue: mutation.payload["user_email"], systemValue: 100 });


    },
  },
  "TaskStatus": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["code"] === undefined) || mutation.payload["code"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("code") });
      if (mutation.payload["code"] != null && [...String(mutation.payload["code"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("code"), inputValue: mutation.payload["code"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["color"] === undefined) || mutation.payload["color"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("color") });
      if (mutation.payload["color"] != null && [...String(mutation.payload["color"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("color"), inputValue: mutation.payload["color"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["display_order"] === undefined) || mutation.payload["display_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("display_order") });

      if ((mutation.action === "Create" && mutation.payload["progress"] === undefined) || mutation.payload["progress"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("progress") });

      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });


    },
  },
  "Task": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && !([...String(mutation.payload["name"])].length >= 1)) results.push({ ruleId: "min_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 1 });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 200) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 200 });

      if ((mutation.action === "Create" && mutation.payload["status"] === undefined) || mutation.payload["status"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("status") });

      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });


    },
  },
  "TaskExecutionLog": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if ((mutation.action === "Create" && mutation.payload["task"] === undefined) || mutation.payload["task"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("task") });

      if ((mutation.action === "Create" && mutation.payload["action"] === undefined) || mutation.payload["action"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("action") });
      if (mutation.payload["action"] != null && [...String(mutation.payload["action"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("action"), inputValue: mutation.payload["action"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["detail"] === undefined) || mutation.payload["detail"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("detail") });
      if (mutation.payload["detail"] != null && [...String(mutation.payload["detail"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("detail"), inputValue: mutation.payload["detail"], systemValue: 100 });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Platform", id: "1", values: { "name": "Robot System", "founded": "createTime()", "userEmail": "admin@robots.example" } },
  constants: [
    { entity: "TaskStatus", id: "1001", values: { "name": "Planned", "code": "PLANNED", "color": "#94A3B8", "displayOrder": decimal("10"), "progress": decimal("0"), "platform": "1" } },
    { entity: "TaskStatus", id: "1002", values: { "name": "Ready", "code": "READY", "color": "#3B82F6", "displayOrder": decimal("20"), "progress": decimal("25"), "platform": "1" } },
    { entity: "TaskStatus", id: "1003", values: { "name": "Executing", "code": "EXECUTING", "color": "#F59E0B", "displayOrder": decimal("30"), "progress": decimal("50"), "platform": "1" } },
    { entity: "TaskStatus", id: "1004", values: { "name": "Verified", "code": "VERIFIED", "color": "#16A34A", "displayOrder": decimal("40"), "progress": decimal("100"), "platform": "1" } }
  ]
}, ensure: ensureGeneratedBootstrap });