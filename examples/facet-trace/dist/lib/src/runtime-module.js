"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENERATED_RUNTIME_MODULE = exports.GENERATED_WIRE_MODEL_METADATA = void 0;
const teaql_ts_1 = require("teaql-ts");
const teaql_node_sql_1 = require("./teaql-node-sql");
const generated_bootstrap_1 = require("./generated-bootstrap");
/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
exports.GENERATED_WIRE_MODEL_METADATA = Object.freeze({
    profile: "camelCase",
    entities: Object.freeze({
        "Platform": Object.freeze({
            entityType: "Platform",
            profile: "camelCase",
            fields: Object.freeze({
                "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([]) }),
                "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([]) }),
                "base_url": Object.freeze({ canonicalName: "base_url", wireName: "baseUrl", aliases: Object.freeze([]) }),
                "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([]) }),
                "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([]) }),
                "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([]) })
            }),
        }),
        "SchoolType": Object.freeze({
            entityType: "SchoolType",
            profile: "camelCase",
            fields: Object.freeze({
                "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([]) }),
                "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([]) }),
                "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([]) }),
                "code": Object.freeze({ canonicalName: "code", wireName: "code", aliases: Object.freeze([]) }),
                "display_order": Object.freeze({ canonicalName: "display_order", wireName: "displayOrder", aliases: Object.freeze([]) }),
                "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([]) })
            }),
        }),
        "School": Object.freeze({
            entityType: "School",
            profile: "camelCase",
            fields: Object.freeze({
                "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([]) }),
                "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([]) }),
                "school_type": Object.freeze({ canonicalName: "school_type", wireName: "schoolType", aliases: Object.freeze([]) }),
                "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([]) }),
                "address": Object.freeze({ canonicalName: "address", wireName: "address", aliases: Object.freeze([]) }),
                "established_date": Object.freeze({ canonicalName: "established_date", wireName: "establishedDate", aliases: Object.freeze([]) }),
                "student_capacity": Object.freeze({ canonicalName: "student_capacity", wireName: "studentCapacity", aliases: Object.freeze([]) }),
                "active": Object.freeze({ canonicalName: "active", wireName: "active", aliases: Object.freeze([]) }),
                "create_time": Object.freeze({ canonicalName: "create_time", wireName: "createTime", aliases: Object.freeze([]) }),
                "update_time": Object.freeze({ canonicalName: "update_time", wireName: "updateTime", aliases: Object.freeze([]) }),
                "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([]) })
            }),
        })
    }),
});
/** Passive generated metadata manifest. It never modifies the database schema. */
exports.GENERATED_RUNTIME_MODULE = new teaql_ts_1.RuntimeModule(teaql_node_sql_1.ENTITY_SCHEMAS, {
    "Platform": {
        checkAndFix(context, mutation, results) {
            const now = context.getResource("fixTime");
            if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
                mutation.payload["create_time"] = now;
                context.recordFixEvidence({ entityType: "Platform", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
            }
            if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
                mutation.payload["update_time"] = now;
                context.recordFixEvidence({ entityType: "Platform", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
            }
            if (mutation.action === "Update") {
                mutation.payload["update_time"] = now;
                context.recordFixEvidence({ entityType: "Platform", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
            }
            if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("name") });
            if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100)
                results.push({ ruleId: "max_length", location: teaql_ts_1.ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });
            if ((mutation.action === "Create" && mutation.payload["base_url"] === undefined) || mutation.payload["base_url"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("base_url") });
            if (mutation.payload["base_url"] != null && [...String(mutation.payload["base_url"])].length > 100)
                results.push({ ruleId: "max_length", location: teaql_ts_1.ObjectLocation.property("base_url"), inputValue: mutation.payload["base_url"], systemValue: 100 });
            if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("create_time") });
            if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("update_time") });
        },
    },
    "SchoolType": {
        checkAndFix(context, mutation, results) {
            const now = context.getResource("fixTime");
            if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("platform") });
            if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("name") });
            if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100)
                results.push({ ruleId: "max_length", location: teaql_ts_1.ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });
            if ((mutation.action === "Create" && mutation.payload["code"] === undefined) || mutation.payload["code"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("code") });
            if (mutation.payload["code"] != null && [...String(mutation.payload["code"])].length > 100)
                results.push({ ruleId: "max_length", location: teaql_ts_1.ObjectLocation.property("code"), inputValue: mutation.payload["code"], systemValue: 100 });
            if ((mutation.action === "Create" && mutation.payload["display_order"] === undefined) || mutation.payload["display_order"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("display_order") });
        },
    },
    "School": {
        checkAndFix(context, mutation, results) {
            const now = context.getResource("fixTime");
            if (mutation.action === "Create" && mutation.payload["create_time"] == null) {
                mutation.payload["create_time"] = now;
                context.recordFixEvidence({ entityType: "School", modelPath: "create_time", source: "clock", sourceLabel: "graphClock" });
            }
            if (mutation.action === "Create" && mutation.payload["update_time"] == null) {
                mutation.payload["update_time"] = now;
                context.recordFixEvidence({ entityType: "School", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
            }
            if (mutation.action === "Update") {
                mutation.payload["update_time"] = now;
                context.recordFixEvidence({ entityType: "School", modelPath: "update_time", source: "clock", sourceLabel: "graphClock" });
            }
            if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("platform") });
            if ((mutation.action === "Create" && mutation.payload["school_type"] === undefined) || mutation.payload["school_type"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("school_type") });
            if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("name") });
            if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100)
                results.push({ ruleId: "max_length", location: teaql_ts_1.ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });
            if ((mutation.action === "Create" && mutation.payload["address"] === undefined) || mutation.payload["address"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("address") });
            if (mutation.payload["address"] != null && [...String(mutation.payload["address"])].length > 100)
                results.push({ ruleId: "max_length", location: teaql_ts_1.ObjectLocation.property("address"), inputValue: mutation.payload["address"], systemValue: 100 });
            if ((mutation.action === "Create" && mutation.payload["established_date"] === undefined) || mutation.payload["established_date"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("established_date") });
            if ((mutation.action === "Create" && mutation.payload["student_capacity"] === undefined) || mutation.payload["student_capacity"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("student_capacity") });
            if ((mutation.action === "Create" && mutation.payload["active"] === undefined) || mutation.payload["active"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("active") });
            if ((mutation.action === "Create" && mutation.payload["create_time"] === undefined) || mutation.payload["create_time"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("create_time") });
            if ((mutation.action === "Create" && mutation.payload["update_time"] === undefined) || mutation.payload["update_time"] === null)
                results.push({ ruleId: "required", location: teaql_ts_1.ObjectLocation.property("update_time") });
        },
    }
}, { ...{
        defaultDomainRoot: { entity: "Platform", id: "1", values: { "name": "Campus Learning Platform", "baseUrl": "https://campus.example.com", "createTime": "createTime()", "updateTime": "updateTime()" } },
        constants: [
            { entity: "SchoolType", id: "1001", values: { "platform": "1", "name": "Primary", "code": "PRIMARY", "displayOrder": 1 } },
            { entity: "SchoolType", id: "1002", values: { "platform": "1", "name": "Secondary", "code": "SECONDARY", "displayOrder": 2 } }
        ]
    }, ensure: generated_bootstrap_1.ensureGeneratedBootstrap });
