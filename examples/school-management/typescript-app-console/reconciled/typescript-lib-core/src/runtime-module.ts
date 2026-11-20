import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ContextFix, ObjectLocation, RuntimeModule } from "teaql-ts";
import { CheckerPresentationModel } from "teaql-ts";
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
        "base_url": Object.freeze({ canonicalName: "base_url", wireName: "baseUrl", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "SchoolType": Object.freeze({
      entityType: "SchoolType",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "code": Object.freeze({ canonicalName: "code", wireName: "code", aliases: Object.freeze([] as string[]) }),
        "display_order": Object.freeze({ canonicalName: "display_order", wireName: "displayOrder", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "School": Object.freeze({
      entityType: "School",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
        "school_type": Object.freeze({ canonicalName: "school_type", wireName: "schoolType", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "address": Object.freeze({ canonicalName: "address", wireName: "address", aliases: Object.freeze([] as string[]) }),
        "established_date": Object.freeze({ canonicalName: "established_date", wireName: "establishedDate", aliases: Object.freeze([] as string[]) }),
        "student_capacity": Object.freeze({ canonicalName: "student_capacity", wireName: "studentCapacity", aliases: Object.freeze([] as string[]) }),
        "active": Object.freeze({ canonicalName: "active", wireName: "active", aliases: Object.freeze([] as string[]) }),
        "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([] as string[]) }),
        "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "Platform": {
    checkAndFix(context, mutation, results) {
      if (mutation.action === "Create") {
        ContextFix.apply(context, mutation, "create_time", "now", []);
      }

      if (mutation.action === "Create") {
        ContextFix.apply(context, mutation, "update_time", "now", []);
      }
      if (mutation.action === "Update") {
        ContextFix.apply(context, mutation, "update_time", "now", []);
      }


      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["base_url"] === undefined) || mutation.payload["base_url"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("base_url") });
      if (mutation.payload["base_url"] != null && [...String(mutation.payload["base_url"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("base_url"), inputValue: mutation.payload["base_url"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  },
  "SchoolType": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });


      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["code"] === undefined) || mutation.payload["code"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("code") });
      if (mutation.payload["code"] != null && [...String(mutation.payload["code"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("code"), inputValue: mutation.payload["code"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["display_order"] === undefined) || mutation.payload["display_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("display_order") });


    },
  },
  "School": {
    checkAndFix(context, mutation, results) {
      if (mutation.action === "Create") {
        ContextFix.apply(context, mutation, "create_time", "now", []);
      }

      if (mutation.action === "Create") {
        ContextFix.apply(context, mutation, "update_time", "now", []);
      }
      if (mutation.action === "Update") {
        ContextFix.apply(context, mutation, "update_time", "now", []);
      }


      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });

      if ((mutation.action === "Create" && mutation.payload["school_type"] === undefined) || mutation.payload["school_type"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("school_type") });

      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["address"] === undefined) || mutation.payload["address"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("address") });
      if (mutation.payload["address"] != null && [...String(mutation.payload["address"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("address"), inputValue: mutation.payload["address"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["established_date"] === undefined) || mutation.payload["established_date"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("established_date") });

      if ((mutation.action === "Create" && mutation.payload["student_capacity"] === undefined) || mutation.payload["student_capacity"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("student_capacity") });

      if ((mutation.action === "Create" && mutation.payload["active"] === undefined) || mutation.payload["active"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("active") });

      if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("create_time") });

      if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("update_time") });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Platform", id: "1", values: { "name": "Campus Learning Platform", "baseUrl": "https://campus.example.com", "createTime": "createTime()", "updateTime": "updateTime()" } },
  constants: [
    { entity: "SchoolType", id: "1001", values: { "platform": "1", "name": "Primary School", "code": "PRIMARY", "displayOrder": decimal("1") } },
    { entity: "SchoolType", id: "1002", values: { "platform": "1", "name": "Secondary", "code": "SECONDARY", "displayOrder": decimal("2") } }
  ]
}, ensure: ensureGeneratedBootstrap }).withCheckerPresentation(CheckerPresentationModel.fromJson("{\"schema\":\"teaql.checker-model/v1\",\"revision\":\"sha256:71ba9da7267282a87034f786438f6f60442609b86ca42c3ef288e51c43107ce1\",\"entities\":{\"Platform\":{\"labels\":{\"en\":\"Platform\"},\"fields\":[{\"name\":\"base_url\",\"labels\":{\"en\":\"base url\"},\"aliases\":[\"BaseUrl\",\"baseUrl\"]},{\"name\":\"create_time\",\"labels\":{\"en\":\"create time\"},\"aliases\":[\"CreateTime\",\"createTime\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\"},\"aliases\":[\"Name\"]},{\"name\":\"school_list\",\"targetType\":\"School\",\"labels\":{\"en\":\"School\"},\"aliases\":[\"SchoolList\",\"schoolList\"]},{\"name\":\"school_type_list\",\"targetType\":\"SchoolType\",\"labels\":{\"en\":\"School Type\"},\"aliases\":[\"SchoolTypeList\",\"schoolTypeList\"]},{\"name\":\"update_time\",\"labels\":{\"en\":\"update time\"},\"aliases\":[\"UpdateTime\",\"updateTime\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]},\"School\":{\"labels\":{\"en\":\"School\"},\"fields\":[{\"name\":\"active\",\"labels\":{\"en\":\"active\"},\"aliases\":[\"Active\"]},{\"name\":\"address\",\"labels\":{\"en\":\"address\"},\"aliases\":[\"Address\"]},{\"name\":\"create_time\",\"labels\":{\"en\":\"create time\"},\"aliases\":[\"CreateTime\",\"createTime\"]},{\"name\":\"established_date\",\"labels\":{\"en\":\"established date\"},\"aliases\":[\"EstablishedDate\",\"establishedDate\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\"},\"aliases\":[\"Name\"]},{\"name\":\"platform\",\"targetType\":\"Platform\",\"labels\":{\"en\":\"Platform\"},\"aliases\":[\"Platform\"]},{\"name\":\"school_type\",\"targetType\":\"SchoolType\",\"labels\":{\"en\":\"School Type\"},\"aliases\":[\"SchoolType\",\"schoolType\"]},{\"name\":\"student_capacity\",\"labels\":{\"en\":\"student capacity\"},\"aliases\":[\"StudentCapacity\",\"studentCapacity\"]},{\"name\":\"update_time\",\"labels\":{\"en\":\"update time\"},\"aliases\":[\"UpdateTime\",\"updateTime\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]},\"SchoolType\":{\"labels\":{\"en\":\"School Type\"},\"fields\":[{\"name\":\"code\",\"labels\":{\"en\":\"code\"},\"aliases\":[\"Code\"]},{\"name\":\"display_order\",\"labels\":{\"en\":\"display order\"},\"aliases\":[\"DisplayOrder\",\"displayOrder\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\"},\"aliases\":[\"Name\"]},{\"name\":\"platform\",\"targetType\":\"Platform\",\"labels\":{\"en\":\"Platform\"},\"aliases\":[\"Platform\"]},{\"name\":\"school_list\",\"targetType\":\"School\",\"labels\":{\"en\":\"School\"},\"aliases\":[\"SchoolList\",\"schoolList\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]}}}"));