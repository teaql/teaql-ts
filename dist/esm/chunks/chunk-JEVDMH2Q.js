import {
  ObjectKey,
  ObjectReadUrlOptions
} from "./chunk-MJFGQZSQ.js";

// src/blob-reference/read-service.ts
var SqlBlobResponseContributor = class {
  constructor(catalog, authorization, maximumUrlSeconds = 600) {
    this.catalog = catalog;
    this.authorization = authorization;
    this.maximumUrlSeconds = maximumUrlSeconds;
    if (!Number.isSafeInteger(maximumUrlSeconds) || maximumUrlSeconds < 1 || maximumUrlSeconds > 3600) {
      throw new TypeError("BLOB_POLICY_INVALID");
    }
  }
  async projectBatch(context, graph, expiresAt) {
    const results = [];
    for (const slot of graph.blobSlots) {
      if (!await this.authorization.authorize(context, slot)) throw new Error("BLOB_READ_DENIED");
      const record = await this.catalog.currentRead(slot);
      const seconds = expiresAt ? Math.min(this.maximumUrlSeconds, Math.floor((expiresAt.getTime() - Date.now()) / 1e3) - 1) : this.maximumUrlSeconds;
      if (seconds < 1) throw new Error("BLOB_REFERENCE_EXPIRED");
      const inline = /^(image\/|audio\/|video\/|application\/pdf$)/.test(record.contentType);
      let signed;
      try {
        signed = await context.objectStorage("prepare authorized Blob view").getReadUrl(
          new ObjectKey(record.objectKey),
          new ObjectReadUrlOptions(seconds, inline ? "inline" : "attachment", record.fileName)
        );
      } catch {
        throw new Error("BLOB_SIGN_FAILED");
      }
      results.push(Object.freeze({ url: signed.url, expiresAt: signed.expiresAt }));
    }
    return Object.freeze(results);
  }
};

export {
  SqlBlobResponseContributor
};
//# sourceMappingURL=chunk-JEVDMH2Q.js.map
