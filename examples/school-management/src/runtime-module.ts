import { ObjectLocation, RuntimeModule } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "Platform": {
    checkAndFix(context, mutation, results) {
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) mutation.payload["create_time"] = now;

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) mutation.payload["update_time"] = now;
      if (mutation.action === "Update") mutation.payload["update_time"] = now;


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
      const now = context.getResource("fixTime");
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
      const now = context.getResource("fixTime");
      if (mutation.action === "Create" && mutation.payload["create_time"] == null) mutation.payload["create_time"] = now;

      if (mutation.action === "Create" && mutation.payload["update_time"] == null) mutation.payload["update_time"] = now;
      if (mutation.action === "Update") mutation.payload["update_time"] = now;


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
}, {
  defaultDomainRoot: { entity: "Platform", id: "1", values: { "name": "Campus Learning Platform", "baseUrl": "https://campus.example.com", "createTime": "createTime()", "updateTime": "updateTime()" } },
  constants: [
    { entity: "SchoolType", id: "1001", values: { "platform": "1", "name": "Primary", "code": "PRIMARY", "displayOrder": "1" } },
    { entity: "SchoolType", id: "1002", values: { "platform": "1", "name": "Secondary", "code": "SECONDARY", "displayOrder": "2" } }
  ]
});
