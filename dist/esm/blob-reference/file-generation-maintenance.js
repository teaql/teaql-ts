import {
  SqliteFencedFileObjectStorage
} from "../chunks/chunk-HHA5UWQI.js";
import {
  BlobMaintenanceCursor
} from "../chunks/chunk-PBGIAQGM.js";
import {
  SQLiteDriver
} from "../chunks/chunk-LCTY3MQQ.js";
import "../chunks/chunk-ZY7L4QDF.js";
import "../chunks/chunk-5LSF6ZWQ.js";
import "../chunks/chunk-LGSUBUWZ.js";
import "../chunks/chunk-5XIEPHRP.js";
import "../chunks/chunk-HDIMWNEB.js";
import "../chunks/chunk-LDU2JPAZ.js";
import {
  BlobRef
} from "../chunks/chunk-VJE6OLEA.js";
import {
  ObjectKey
} from "../chunks/chunk-WMEMPDYD.js";
import "../chunks/chunk-WEYNFMW2.js";
import "../chunks/chunk-AQT573VW.js";

// src/blob-reference/file-generation-maintenance.ts
var validScope = (value) => typeof value === "string" && !!value.trim() && value === value.trim() && Buffer.byteLength(value) <= 256 && !/[\x00-\x1f\x7f-\x9f]/.test(value);
var SqliteBlobFileGenerationSweepService = class {
  constructor(catalog, authorization, allWritersUpgraded, batchSize = 100) {
    this.catalog = catalog;
    this.authorization = authorization;
    this.allWritersUpgraded = allWritersUpgraded;
    this.batchSize = batchSize;
    if (!(catalog.driver instanceof SQLiteDriver) || !authorization || allWritersUpgraded !== true || !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1e3) throw new Error("BLOB_POLICY_INVALID");
  }
  async authorize(context, expected) {
    let scope, allowed;
    try {
      scope = this.authorization.scope(context);
      allowed = await this.authorization.canMaintain(context, scope);
    } catch {
      throw new Error("BLOB_MAINTENANCE_DENIED");
    }
    if (!validScope(scope) || expected !== void 0 && scope !== expected || !allowed)
      throw new Error("BLOB_MAINTENANCE_DENIED");
    return scope;
  }
  async runBatch(context, provider, cursor) {
    const scope = await this.authorize(context);
    if (cursor !== void 0 && (!(cursor instanceof BlobMaintenanceCursor) || !cursor.matches(scope)))
      throw new Error("BLOB_MAINTENANCE_DENIED");
    try {
      this.catalog.driver.assertNoCurrentTransaction();
    } catch {
      throw new Error("BLOB_TRANSACTION_REQUIRED");
    }
    if (!(provider instanceof SqliteFencedFileObjectStorage) || context.getResource("objectStorageProvider") !== provider)
      throw new Error("BLOB_CAPABILITY_MISSING");
    await this.catalog.validateSchema();
    const candidates = await this.catalog.fileGenerationSweepCandidates(
      scope,
      cursor?.position() ?? "",
      this.batchSize
    );
    const outcomes = [];
    for (const candidate of candidates) {
      await this.authorize(context, scope);
      const reference = new BlobRef(candidate.key);
      try {
        const removedGenerations = await provider.sweepOldGenerations(new ObjectKey(candidate.objectKey));
        if (!Number.isSafeInteger(removedGenerations) || removedGenerations < 0)
          throw new Error("BLOB_STORE_FAILED");
        outcomes.push(Object.freeze({ reference, status: "swept", removedGenerations }));
      } catch {
        outcomes.push(Object.freeze({ reference, status: "failed", error: "BLOB_STORE_FAILED" }));
      }
    }
    return Object.freeze({
      outcomes: Object.freeze(outcomes),
      next: candidates.length === this.batchSize ? BlobMaintenanceCursor.next(scope, candidates[candidates.length - 1].key) : void 0
    });
  }
};
export {
  SqliteBlobFileGenerationSweepService
};
//# sourceMappingURL=file-generation-maintenance.js.map
