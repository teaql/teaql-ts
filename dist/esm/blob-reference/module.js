import {
  installRuntimeCapability,
  requireRuntimeCapabilities
} from "../chunks/chunk-HDIMWNEB.js";
import {
  SqlBlobCatalog
} from "../chunks/chunk-VO5ICQHI.js";
import {
  SqliteBlobMutationParticipant
} from "../chunks/chunk-OVOYPDF7.js";
import {
  SqlBlobResponseContributor
} from "../chunks/chunk-POR4V4RW.js";
import {
  SqliteBlobUploadService
} from "../chunks/chunk-YT2ARN4Y.js";
import "../chunks/chunk-I5BWLNYV.js";
import {
  SqliteBlobMaintenanceService
} from "../chunks/chunk-NJY2M2JN.js";
import "../chunks/chunk-VJE6OLEA.js";
import "../chunks/chunk-3BPR3EGQ.js";
import "../chunks/chunk-WEYNFMW2.js";
import "../chunks/chunk-AQT573VW.js";

// src/blob-reference/module.ts
var BlobReferenceModule = class {
  constructor(catalog, upload, mutation, response, maintenance) {
    this.catalog = catalog;
    this.upload = upload;
    this.mutation = mutation;
    this.response = response;
    this.maintenance = maintenance;
    this.installations = /* @__PURE__ */ new WeakMap();
    this.assertCoherentAssembly();
  }
  assertCoherentAssembly() {
    if (!(this.catalog instanceof SqlBlobCatalog) || this.catalog.driver.databaseKind !== "sqlite" || !(this.upload instanceof SqliteBlobUploadService) || !(this.mutation instanceof SqliteBlobMutationParticipant) || !(this.response instanceof SqlBlobResponseContributor) || !this.upload.usesCatalog(this.catalog) || !this.mutation.usesCatalog(this.catalog) || !this.response.usesCatalog(this.catalog) || this.maintenance !== void 0 && (!(this.maintenance instanceof SqliteBlobMaintenanceService) || !this.maintenance.usesCatalog(this.catalog))) {
      throw new Error("BLOB_CAPABILITY_MISSING");
    }
  }
  install(context) {
    this.assertCoherentAssembly();
    if (!context || [
      "teaql.runtime.capability:blob.v1",
      "blobUploadService",
      "blobMutationParticipant",
      "blobResponseContributor",
      "blobMaintenanceService"
    ].some((name) => context.getResource(name))) {
      throw new Error("BLOB_CAPABILITY_MISSING");
    }
    const capability = { name: "blob.v1", assertReady: (current) => {
      this.assertCoherentAssembly();
      const owner = current.getResource("dataService");
      let compatibleOwner = false;
      try {
        compatibleOwner = owner?.usesSqlDatabase?.(this.catalog.driver) === true;
      } catch {
      }
      if (current !== context || current.getResource("blobUploadService") !== this.upload || current.getResource("blobMutationParticipant") !== this.mutation || current.getResource("blobResponseContributor") !== this.response || this.maintenance !== void 0 && current.getResource("blobMaintenanceService") !== this.maintenance || !current.getResource("objectStorageProvider") || !compatibleOwner) {
        throw new Error("BLOB_CAPABILITY_MISSING");
      }
    } };
    installRuntimeCapability(context, capability);
    context.insertResource("blobUploadService", this.upload);
    context.insertResource("blobMutationParticipant", this.mutation);
    context.insertResource("blobResponseContributor", this.response);
    if (this.maintenance) context.insertResource("blobMaintenanceService", this.maintenance);
    this.installations.set(context, capability);
  }
  /** Called explicitly after the host runs its catalog migration. */
  async ready(context) {
    const installed = this.installations.get(context);
    if (!installed || context.getResource("teaql.runtime.capability:blob.v1") !== installed) {
      throw new Error("BLOB_CAPABILITY_MISSING");
    }
    requireRuntimeCapabilities(context, ["blob.v1"]);
    await this.catalog.validateSchema();
    await this.upload.validateVerifierReady();
  }
};
export {
  BlobReferenceModule
};
//# sourceMappingURL=module.js.map
