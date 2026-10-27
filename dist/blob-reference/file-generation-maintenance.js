"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteBlobFileGenerationSweepService = void 0;
const blob_ref_1 = require("../core/blob-ref");
const object_storage_1 = require("../core/object-storage");
const file_1 = require("../object-storage/file");
const sqlite_1 = require("../sql/sqlite");
const maintenance_service_1 = require("./maintenance-service");
const validScope = (value) => typeof value === 'string' && !!value.trim() && value === value.trim() &&
    Buffer.byteLength(value) <= 256 && !/[\x00-\x1f\x7f-\x9f]/.test(value);
/** Explicit catalog-driven sweep of inaccessible File generations. The host
 * must first upgrade every writer sharing the private root to the fenced
 * protocol; this service never starts a worker or guesses that from age. */
class SqliteBlobFileGenerationSweepService {
    constructor(catalog, authorization, allWritersUpgraded, batchSize = 100) {
        this.catalog = catalog;
        this.authorization = authorization;
        this.allWritersUpgraded = allWritersUpgraded;
        this.batchSize = batchSize;
        if (!(catalog.driver instanceof sqlite_1.SQLiteDriver) || !authorization ||
            allWritersUpgraded !== true || !Number.isSafeInteger(batchSize) ||
            batchSize < 1 || batchSize > 1000)
            throw new Error('BLOB_POLICY_INVALID');
    }
    async authorize(context, expected) {
        let scope, allowed;
        try {
            scope = this.authorization.scope(context);
            allowed = await this.authorization.canMaintain(context, scope);
        }
        catch {
            throw new Error('BLOB_MAINTENANCE_DENIED');
        }
        if (!validScope(scope) || expected !== undefined && scope !== expected || !allowed)
            throw new Error('BLOB_MAINTENANCE_DENIED');
        return scope;
    }
    async runBatch(context, provider, cursor) {
        const scope = await this.authorize(context);
        if (cursor !== undefined && (!(cursor instanceof maintenance_service_1.BlobMaintenanceCursor) || !cursor.matches(scope)))
            throw new Error('BLOB_MAINTENANCE_DENIED');
        try {
            this.catalog.driver.assertNoCurrentTransaction();
        }
        catch {
            throw new Error('BLOB_TRANSACTION_REQUIRED');
        }
        if (!(provider instanceof file_1.SqliteFencedFileObjectStorage) ||
            context.getResource('objectStorageProvider') !== provider)
            throw new Error('BLOB_CAPABILITY_MISSING');
        await this.catalog.validateSchema();
        const candidates = await this.catalog.fileGenerationSweepCandidates(scope, cursor?.position() ?? '', this.batchSize);
        const outcomes = [];
        for (const candidate of candidates) {
            await this.authorize(context, scope);
            const reference = new blob_ref_1.BlobRef(candidate.key);
            try {
                const removedGenerations = await provider.sweepOldGenerations(new object_storage_1.ObjectKey(candidate.objectKey));
                if (!Number.isSafeInteger(removedGenerations) || removedGenerations < 0)
                    throw new Error('BLOB_STORE_FAILED');
                outcomes.push(Object.freeze({ reference, status: 'swept', removedGenerations }));
            }
            catch {
                outcomes.push(Object.freeze({ reference, status: 'failed', error: 'BLOB_STORE_FAILED' }));
            }
        }
        return Object.freeze({ outcomes: Object.freeze(outcomes),
            next: candidates.length === this.batchSize
                ? maintenance_service_1.BlobMaintenanceCursor.next(scope, candidates[candidates.length - 1].key) : undefined });
    }
}
exports.SqliteBlobFileGenerationSweepService = SqliteBlobFileGenerationSweepService;
//# sourceMappingURL=file-generation-maintenance.js.map