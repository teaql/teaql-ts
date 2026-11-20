import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ContextFix, ObjectLocation, RuntimeModule } from "teaql-ts";
import { CheckerPresentationModel } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";
import { ensureGeneratedBootstrap } from "./generated-bootstrap";

/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
export const GENERATED_WIRE_MODEL_METADATA = Object.freeze({
  profile: "camelCase" as const,
  entities: Object.freeze({
    "DistributionCenter": Object.freeze({
      entityType: "DistributionCenter",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "dock_name": Object.freeze({ canonicalName: "dock_name", wireName: "dockName", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "DispatchOrder": Object.freeze({
      entityType: "DispatchOrder",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "distribution_center": Object.freeze({ canonicalName: "distribution_center", wireName: "distributionCenter", aliases: Object.freeze([] as string[]) }),
        "order_reference": Object.freeze({ canonicalName: "order_reference", wireName: "orderReference", aliases: Object.freeze([] as string[]) }),
        "handling_note": Object.freeze({ canonicalName: "handling_note", wireName: "handlingNote", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "DistributionCenter": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["dock_name"] === undefined) || mutation.payload["dock_name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("dock_name") });
      if (mutation.payload["dock_name"] != null && [...String(mutation.payload["dock_name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("dock_name"), inputValue: mutation.payload["dock_name"], systemValue: 100 });


    },
  },
  "DispatchOrder": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["distribution_center"] === undefined) || mutation.payload["distribution_center"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("distribution_center") });

      if ((mutation.action === "Create" && mutation.payload["order_reference"] === undefined) || mutation.payload["order_reference"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("order_reference") });
      if (mutation.payload["order_reference"] != null && [...String(mutation.payload["order_reference"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("order_reference"), inputValue: mutation.payload["order_reference"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["handling_note"] === undefined) || mutation.payload["handling_note"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("handling_note") });
      if (mutation.payload["handling_note"] != null && [...String(mutation.payload["handling_note"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("handling_note"), inputValue: mutation.payload["handling_note"], systemValue: 100 });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "DistributionCenter", id: "1", values: { "dockName": "North Receiving Terminal" } },
  constants: []
}, ensure: ensureGeneratedBootstrap }).withCheckerPresentation(CheckerPresentationModel.fromJson("{\"schema\":\"teaql.checker-model/v1\",\"revision\":\"sha256:77ad1b3df638005c05c3bca45d54d613c2443bb125585299b8cdcd3593870eae\",\"entities\":{\"DispatchOrder\":{\"labels\":{\"en\":\"dispatch order\"},\"fields\":[{\"name\":\"distribution_center\",\"targetType\":\"DistributionCenter\",\"labels\":{\"en\":\"distribution center\"},\"aliases\":[\"DistributionCenter\",\"distributionCenter\"]},{\"name\":\"handling_note\",\"labels\":{\"en\":\"handling note\"},\"aliases\":[\"HandlingNote\",\"handlingNote\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"order_reference\",\"labels\":{\"en\":\"order reference\"},\"aliases\":[\"OrderReference\",\"orderReference\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]},\"DistributionCenter\":{\"labels\":{\"en\":\"distribution center\"},\"fields\":[{\"name\":\"dispatch_order_list\",\"targetType\":\"DispatchOrder\",\"labels\":{\"en\":\"dispatch order\"},\"aliases\":[\"DispatchOrderList\",\"dispatchOrderList\"]},{\"name\":\"dock_name\",\"labels\":{\"en\":\"dock name\"},\"aliases\":[\"DockName\",\"dockName\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]}}}"));