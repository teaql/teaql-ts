import {
  installRuntimeCapability,
  requireRuntimeCapabilities
} from "../chunks/chunk-HDIMWNEB.js";
import {
  SqlBlobCatalog
} from "../chunks/chunk-HW6O6RX7.js";
import {
  SqliteBlobMutationParticipant
} from "../chunks/chunk-6E4S7465.js";
import {
  SqlBlobResponseContributor
} from "../chunks/chunk-JEVDMH2Q.js";
import {
  SqliteBlobUploadService
} from "../chunks/chunk-4FDXHNDF.js";
import "../chunks/chunk-VJE6OLEA.js";
import "../chunks/chunk-MJFGQZSQ.js";
import "../chunks/chunk-WEYNFMW2.js";
import "../chunks/chunk-AQT573VW.js";

// src/blob-reference/module.ts
var BlobReferenceModule = class {
  constructor(catalog, upload, mutation, response) {
    this.catalog = catalog;
    this.upload = upload;
    this.mutation = mutation;
    this.response = response;
    if (!(catalog instanceof SqlBlobCatalog) || catalog.driver.databaseKind !== "sqlite" || !(upload instanceof SqliteBlobUploadService) || !(mutation instanceof SqliteBlobMutationParticipant) || !(response instanceof SqlBlobResponseContributor)) {
      throw new Error("BLOB_CAPABILITY_MISSING");
    }
  }
  install(context) {
    if (!context || [
      "teaql.runtime.capability:blob.v1",
      "blobUploadService",
      "blobMutationParticipant",
      "blobResponseContributor"
    ].some((name) => context.getResource(name))) {
      throw new Error("BLOB_CAPABILITY_MISSING");
    }
    installRuntimeCapability(context, { name: "blob.v1", assertReady: (current) => {
      if (current !== context || current.getResource("blobUploadService") !== this.upload || current.getResource("blobMutationParticipant") !== this.mutation || current.getResource("blobResponseContributor") !== this.response || !current.getResource("objectStorageProvider")) {
        throw new Error("BLOB_CAPABILITY_MISSING");
      }
    } });
    context.insertResource("blobUploadService", this.upload);
    context.insertResource("blobMutationParticipant", this.mutation);
    context.insertResource("blobResponseContributor", this.response);
  }
  /** Called explicitly after the host runs its catalog migration. */
  async ready(context) {
    requireRuntimeCapabilities(context, ["blob.v1"]);
    await this.catalog.validateSchema();
  }
};
export {
  BlobReferenceModule
};
//# sourceMappingURL=module.js.map
