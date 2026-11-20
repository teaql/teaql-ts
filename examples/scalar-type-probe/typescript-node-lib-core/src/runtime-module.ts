import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ContextFix, ObjectLocation, RuntimeModule } from "teaql-ts";
import { CheckerPresentationModel } from "teaql-ts";
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
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "FreightQuote": Object.freeze({
      entityType: "FreightQuote",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "platform": Object.freeze({ canonicalName: "platform", wireName: "platform", aliases: Object.freeze([] as string[]) }),
        "reference": Object.freeze({ canonicalName: "reference", wireName: "reference", aliases: Object.freeze([] as string[]) }),
        "amount": Object.freeze({ canonicalName: "amount", wireName: "amount", aliases: Object.freeze([] as string[]) }),
        "shipment_number": Object.freeze({ canonicalName: "shipment_number", wireName: "shipmentNumber", aliases: Object.freeze([] as string[]) }),
        "package_count": Object.freeze({ canonicalName: "package_count", wireName: "packageCount", aliases: Object.freeze([] as string[]) }),
        "delivery_date": Object.freeze({ canonicalName: "delivery_date", wireName: "deliveryDate", aliases: Object.freeze([] as string[]) }),
        "pickup_time": Object.freeze({ canonicalName: "pickup_time", wireName: "pickupTime", aliases: Object.freeze([] as string[]) }),
        "quoted_at": Object.freeze({ canonicalName: "quoted_at", wireName: "quotedAt", aliases: Object.freeze([] as string[]) }),
        "instructions": Object.freeze({ canonicalName: "instructions", wireName: "instructions", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "Platform": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });


    },
  },
  "FreightQuote": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["platform"] === undefined) || mutation.payload["platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("platform") });

      if ((mutation.action === "Create" && mutation.payload["reference"] === undefined) || mutation.payload["reference"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("reference") });
      if (mutation.payload["reference"] != null && [...String(mutation.payload["reference"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("reference"), inputValue: mutation.payload["reference"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["amount"] === undefined) || mutation.payload["amount"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("amount") });

      if ((mutation.action === "Create" && mutation.payload["shipment_number"] === undefined) || mutation.payload["shipment_number"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("shipment_number") });

      if ((mutation.action === "Create" && mutation.payload["package_count"] === undefined) || mutation.payload["package_count"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("package_count") });

      if ((mutation.action === "Create" && mutation.payload["delivery_date"] === undefined) || mutation.payload["delivery_date"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("delivery_date") });

      if ((mutation.action === "Create" && mutation.payload["pickup_time"] === undefined) || mutation.payload["pickup_time"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("pickup_time") });

      if ((mutation.action === "Create" && mutation.payload["quoted_at"] === undefined) || mutation.payload["quoted_at"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("quoted_at") });

      if (mutation.payload["instructions"] != null && [...String(mutation.payload["instructions"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("instructions"), inputValue: mutation.payload["instructions"], systemValue: 100 });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "Platform", id: "1", values: { "name": "Harbor Freight Desk" } },
  constants: []
}, ensure: ensureGeneratedBootstrap }).withCheckerPresentation(CheckerPresentationModel.fromJson("{\"schema\":\"teaql.checker-model/v1\",\"revision\":\"sha256:3b8da34e762562f0877bfd04865e33c225b4d854c8a5914ea30b4a922d3df3b7\",\"entities\":{\"FreightQuote\":{\"labels\":{\"en\":\"Freight Quote\"},\"fields\":[{\"name\":\"amount\",\"labels\":{\"en\":\"amount\"},\"aliases\":[\"Amount\"]},{\"name\":\"delivery_date\",\"labels\":{\"en\":\"delivery date\"},\"aliases\":[\"DeliveryDate\",\"deliveryDate\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"instructions\",\"labels\":{\"en\":\"instructions\"},\"aliases\":[\"Instructions\"]},{\"name\":\"package_count\",\"labels\":{\"en\":\"package count\"},\"aliases\":[\"PackageCount\",\"packageCount\"]},{\"name\":\"pickup_time\",\"labels\":{\"en\":\"pickup time\"},\"aliases\":[\"PickupTime\",\"pickupTime\"]},{\"name\":\"platform\",\"targetType\":\"Platform\",\"labels\":{\"en\":\"Dispatch Platform\"},\"aliases\":[\"Platform\"]},{\"name\":\"quoted_at\",\"labels\":{\"en\":\"quoted at\"},\"aliases\":[\"QuotedAt\",\"quotedAt\"]},{\"name\":\"reference\",\"labels\":{\"en\":\"reference\"},\"aliases\":[\"Reference\"]},{\"name\":\"shipment_number\",\"labels\":{\"en\":\"shipment number\"},\"aliases\":[\"ShipmentNumber\",\"shipmentNumber\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]},\"Platform\":{\"labels\":{\"en\":\"Dispatch Platform\"},\"fields\":[{\"name\":\"freight_quote_list\",\"targetType\":\"FreightQuote\",\"labels\":{\"en\":\"Freight Quote\"},\"aliases\":[\"FreightQuoteList\",\"freightQuoteList\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\"},\"aliases\":[\"Name\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]}}}"));