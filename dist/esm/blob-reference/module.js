import {
  SqlBlobCatalog
} from "../chunks/chunk-CE6SCGYP.js";
import {
  SqliteBlobMutationParticipant
} from "../chunks/chunk-6E4S7465.js";
import {
  SqlBlobResponseContributor
} from "../chunks/chunk-ZWVT5JVC.js";
import {
  SqliteBlobUploadService
} from "../chunks/chunk-FIBPACBR.js";
import "../chunks/chunk-I5BWLNYV.js";
import {
  SqliteBlobMaintenanceService
} from "../chunks/chunk-PBGIAQGM.js";
import "../chunks/chunk-LCTY3MQQ.js";
import "../chunks/chunk-ZY7L4QDF.js";
import "../chunks/chunk-5LSF6ZWQ.js";
import "../chunks/chunk-LGSUBUWZ.js";
import "../chunks/chunk-5XIEPHRP.js";
import {
  installRuntimeCapability,
  requireRuntimeCapabilities
} from "../chunks/chunk-HDIMWNEB.js";
import "../chunks/chunk-LDU2JPAZ.js";
import "../chunks/chunk-VJE6OLEA.js";
import "../chunks/chunk-WMEMPDYD.js";
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
    if (!(catalog instanceof SqlBlobCatalog) || catalog.driver.databaseKind !== "sqlite" || !(upload instanceof SqliteBlobUploadService) || !(mutation instanceof SqliteBlobMutationParticipant) || !(response instanceof SqlBlobResponseContributor) || maintenance !== void 0 && !(maintenance instanceof SqliteBlobMaintenanceService)) {
      throw new Error("BLOB_CAPABILITY_MISSING");
    }
  }
  install(context) {
    if (!context || [
      "teaql.runtime.capability:blob.v1",
      "blobUploadService",
      "blobMutationParticipant",
      "blobResponseContributor",
      "blobMaintenanceService"
    ].some((name) => context.getResource(name))) {
      throw new Error("BLOB_CAPABILITY_MISSING");
    }
    installRuntimeCapability(context, { name: "blob.v1", assertReady: (current) => {
      if (current !== context || current.getResource("blobUploadService") !== this.upload || current.getResource("blobMutationParticipant") !== this.mutation || current.getResource("blobResponseContributor") !== this.response || this.maintenance !== void 0 && current.getResource("blobMaintenanceService") !== this.maintenance || !current.getResource("objectStorageProvider")) {
        throw new Error("BLOB_CAPABILITY_MISSING");
      }
    } });
    context.insertResource("blobUploadService", this.upload);
    context.insertResource("blobMutationParticipant", this.mutation);
    context.insertResource("blobResponseContributor", this.response);
    if (this.maintenance) context.insertResource("blobMaintenanceService", this.maintenance);
  }
  /** Called explicitly after the host runs its catalog migration. */
  async ready(context) {
    requireRuntimeCapabilities(context, ["blob.v1"]);
    await this.catalog.validateSchema();
    await this.upload.validateVerifierReady();
  }
};
export {
  BlobReferenceModule
};
//# sourceMappingURL=module.js.map
