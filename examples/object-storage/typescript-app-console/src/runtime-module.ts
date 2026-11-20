import { compareDecimals, decimal, compareLongs, long, localTime } from './teaql-ts';
import { ContextFix, ObjectLocation, RuntimeModule } from "teaql-ts";
import { CheckerPresentationModel } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";
import { ensureGeneratedBootstrap } from "./generated-bootstrap";

/** Generated canonical KSML to selected-wire mapping. Never infer this from TS members. */
export const GENERATED_WIRE_MODEL_METADATA = Object.freeze({
  profile: "camelCase" as const,
  entities: Object.freeze({
    "CommercePlatform": Object.freeze({
      entityType: "CommercePlatform",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "name": Object.freeze({ canonicalName: "name", wireName: "name", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "CustomerOrder": Object.freeze({
      entityType: "CustomerOrder",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "order_number": Object.freeze({ canonicalName: "order_number", wireName: "orderNumber", aliases: Object.freeze([] as string[]) }),
        "commerce_platform": Object.freeze({ canonicalName: "commerce_platform", wireName: "commercePlatform", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    }),
    "OrderAttachment": Object.freeze({
      entityType: "OrderAttachment",
      profile: "camelCase" as const,
      fields: Object.freeze({
        "id": Object.freeze({ canonicalName: "id", wireName: "id", aliases: Object.freeze([] as string[]) }),
        "customer_order": Object.freeze({ canonicalName: "customer_order", wireName: "customerOrder", aliases: Object.freeze([] as string[]) }),
        "file_name": Object.freeze({ canonicalName: "file_name", wireName: "fileName", aliases: Object.freeze([] as string[]) }),
        "content_type": Object.freeze({ canonicalName: "content_type", wireName: "contentType", aliases: Object.freeze([] as string[]) }),
        "content_length": Object.freeze({ canonicalName: "content_length", wireName: "contentLength", aliases: Object.freeze([] as string[]) }),
        "content_sha256": Object.freeze({ canonicalName: "content_sha256", wireName: "contentSha256", aliases: Object.freeze([] as string[]) }),
        "object_key": Object.freeze({ canonicalName: "object_key", wireName: "objectKey", aliases: Object.freeze([] as string[]) }),
        "version": Object.freeze({ canonicalName: "version", wireName: "version", aliases: Object.freeze([] as string[]) })
      }),
    })
  }),
});

/** Passive generated metadata manifest. It never modifies the database schema. */
export const GENERATED_RUNTIME_MODULE = new RuntimeModule(ENTITY_SCHEMAS, {
  "CommercePlatform": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["name"] === undefined) || mutation.payload["name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("name") });
      if (mutation.payload["name"] != null && [...String(mutation.payload["name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("name"), inputValue: mutation.payload["name"], systemValue: 100 });


    },
  },
  "CustomerOrder": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["order_number"] === undefined) || mutation.payload["order_number"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("order_number") });
      if (mutation.payload["order_number"] != null && [...String(mutation.payload["order_number"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("order_number"), inputValue: mutation.payload["order_number"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["commerce_platform"] === undefined) || mutation.payload["commerce_platform"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("commerce_platform") });


    },
  },
  "OrderAttachment": {
    checkAndFix(context, mutation, results) {
      if ((mutation.action === "Create" && mutation.payload["customer_order"] === undefined) || mutation.payload["customer_order"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("customer_order") });

      if ((mutation.action === "Create" && mutation.payload["file_name"] === undefined) || mutation.payload["file_name"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("file_name") });
      if (mutation.payload["file_name"] != null && [...String(mutation.payload["file_name"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("file_name"), inputValue: mutation.payload["file_name"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["content_type"] === undefined) || mutation.payload["content_type"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("content_type") });
      if (mutation.payload["content_type"] != null && [...String(mutation.payload["content_type"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("content_type"), inputValue: mutation.payload["content_type"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["content_length"] === undefined) || mutation.payload["content_length"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("content_length") });

      if ((mutation.action === "Create" && mutation.payload["content_sha256"] === undefined) || mutation.payload["content_sha256"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("content_sha256") });
      if (mutation.payload["content_sha256"] != null && [...String(mutation.payload["content_sha256"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("content_sha256"), inputValue: mutation.payload["content_sha256"], systemValue: 100 });

      if ((mutation.action === "Create" && mutation.payload["object_key"] === undefined) || mutation.payload["object_key"] === null) results.push({ ruleId: "required", location: ObjectLocation.property("object_key") });
      if (mutation.payload["object_key"] != null && [...String(mutation.payload["object_key"])].length > 100) results.push({ ruleId: "max_length", location: ObjectLocation.property("object_key"), inputValue: mutation.payload["object_key"], systemValue: 100 });


    },
  }
}, { ...{
  defaultDomainRoot: { entity: "CommercePlatform", id: "1", values: { "name": "Order Attachments" } },
  constants: []
}, ensure: ensureGeneratedBootstrap }).withCheckerPresentation(CheckerPresentationModel.fromJson("{\"schema\":\"teaql.checker-model/v1\",\"revision\":\"sha256:f6fb4b9ca6d876325850fdce5a0d2ab5c57f19c74af6bbffb2b494779e9c27b9\",\"entities\":{\"CommercePlatform\":{\"labels\":{\"en\":\"commerce platform\"},\"fields\":[{\"name\":\"customer_order_list\",\"targetType\":\"CustomerOrder\",\"labels\":{\"en\":\"customer order\"},\"aliases\":[\"CustomerOrderList\",\"customerOrderList\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"name\",\"labels\":{\"en\":\"name\"},\"aliases\":[\"Name\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]},\"CustomerOrder\":{\"labels\":{\"en\":\"customer order\"},\"fields\":[{\"name\":\"commerce_platform\",\"targetType\":\"CommercePlatform\",\"labels\":{\"en\":\"commerce platform\"},\"aliases\":[\"CommercePlatform\",\"commercePlatform\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"order_attachment_list\",\"targetType\":\"OrderAttachment\",\"labels\":{\"en\":\"order attachment\"},\"aliases\":[\"OrderAttachmentList\",\"orderAttachmentList\"]},{\"name\":\"order_number\",\"labels\":{\"en\":\"order number\"},\"aliases\":[\"OrderNumber\",\"orderNumber\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]},\"OrderAttachment\":{\"labels\":{\"en\":\"order attachment\"},\"fields\":[{\"name\":\"content_length\",\"labels\":{\"en\":\"content length\"},\"aliases\":[\"ContentLength\",\"contentLength\"]},{\"name\":\"content_sha256\",\"labels\":{\"en\":\"content sha256\"},\"aliases\":[\"ContentSha256\",\"contentSha256\"]},{\"name\":\"content_type\",\"labels\":{\"en\":\"content type\"},\"aliases\":[\"ContentType\",\"contentType\"]},{\"name\":\"customer_order\",\"targetType\":\"CustomerOrder\",\"labels\":{\"en\":\"customer order\"},\"aliases\":[\"CustomerOrder\",\"customerOrder\"]},{\"name\":\"file_name\",\"labels\":{\"en\":\"file name\"},\"aliases\":[\"FileName\",\"fileName\"]},{\"name\":\"id\",\"labels\":{\"en\":\"id\"},\"aliases\":[\"Id\"]},{\"name\":\"object_key\",\"labels\":{\"en\":\"object key\"},\"aliases\":[\"ObjectKey\",\"objectKey\"]},{\"name\":\"version\",\"labels\":{\"en\":\"version\"},\"aliases\":[\"Version\"]}]}}}"));