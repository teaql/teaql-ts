"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteBlobMaintenanceService = exports.BlobMaintenanceCursor = void 0;
const blob_ref_1 = require("../core/blob-ref");
const object_storage_1 = require("../core/object-storage");
const sqlite_1 = require("../sql/sqlite");
class BlobMaintenanceCursor {
    constructor(scopeValue, afterValue) {
        this.scopeValue = scopeValue;
        this.afterValue = afterValue;
    }
    static next(scope, after) {
        return new BlobMaintenanceCursor(scope, after);
    }
    matches(scope) { return this.scopeValue === scope; }
    position() { return this.afterValue; }
    toString() { return 'BlobMaintenanceCursor[masked]'; }
}
exports.BlobMaintenanceCursor = BlobMaintenanceCursor;
const validScope = (value) => typeof value === 'string' && !!value.trim() && value === value.trim() &&
    Buffer.byteLength(value) <= 256 && !/[\x00-\x1f\x7f-\x9f]/.test(value);
/** Explicit host-scheduled collection of expired, uncompleted server-stream uploads only. */
class SqliteBlobMaintenanceService {
    constructor(catalog, authorization, batchSize = 100, now = Date.now) {
        this.catalog = catalog;
        this.authorization = authorization;
        this.batchSize = batchSize;
        this.now = now;
        if (!(catalog.driver instanceof sqlite_1.SQLiteDriver) || !authorization ||
            !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
            throw new Error('BLOB_POLICY_INVALID');
        }
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
    requireStandalone() {
        try {
            this.catalog.driver.assertNoCurrentTransaction();
        }
        catch {
            throw new Error('BLOB_TRANSACTION_REQUIRED');
        }
    }
    time() {
        const value = this.now();
        if (!Number.isSafeInteger(value) || value < 0)
            throw new Error('BLOB_POLICY_INVALID');
        return value;
    }
    async collect(context, scope, key, store) {
        const reference = new blob_ref_1.BlobRef(key);
        await this.authorize(context, scope);
        const claim = await this.catalog.claimExpiredUploadDeletion(scope, key, this.time());
        if (!claim)
            return { reference, status: 'not_eligible' };
        await this.authorize(context, scope);
        const objectKey = new object_storage_1.ObjectKey(claim.objectKey);
        let version = claim.contentVersion;
        if (version && claim.writtenETag && version !== claim.writtenETag)
            throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
        if (!version) {
            let observed;
            try {
                observed = await store.head(objectKey);
            }
            catch {
                throw new Error('BLOB_STORE_FAILED');
            }
            if (observed) {
                if (!observed.etag || claim.writtenETag && observed.etag !== claim.writtenETag)
                    throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
                version = observed.etag;
                await this.authorize(context, scope);
                await this.catalog.captureExpiredDeletionVersion(scope, claim, version, this.time());
            }
        }
        await this.authorize(context, scope);
        let status = 'already_missing';
        if (version) {
            let result;
            try {
                result = await store.deleteIfVersion(objectKey, version);
            }
            catch {
                throw new Error('BLOB_STORE_FAILED');
            }
            if (result === 'version_mismatch')
                throw new Error('BLOB_IDEMPOTENCY_CONFLICT');
            status = result;
        }
        await this.authorize(context, scope);
        await this.catalog.finishExpiredUploadDeletion(scope, claim, version, this.time());
        return { reference, status };
    }
    async runBatch(context, cursor) {
        const scope = await this.authorize(context);
        if (cursor !== undefined && (!(cursor instanceof BlobMaintenanceCursor) || !cursor.matches(scope)))
            throw new Error('BLOB_MAINTENANCE_DENIED');
        this.requireStandalone();
        let store;
        try {
            store = context.objectStorage('collect expired Blob upload');
        }
        catch {
            throw new Error('BLOB_CAPABILITY_MISSING');
        }
        if (!store.supportsVersionConditionalDelete())
            throw new Error('BLOB_CAPABILITY_MISSING');
        await this.catalog.validateSchema();
        const candidates = await this.catalog.expiredUploadDeletionCandidates(scope, cursor?.position() ?? '', this.time(), this.batchSize);
        const outcomes = [];
        for (const key of candidates) {
            try {
                outcomes.push(await this.collect(context, scope, key, store));
            }
            catch (error) {
                if (error instanceof Error && ['BLOB_MAINTENANCE_DENIED', 'BLOB_TRANSACTION_REQUIRED'].includes(error.message))
                    throw error;
                const code = error instanceof Error ? error.message : '';
                outcomes.push({ reference: new blob_ref_1.BlobRef(key),
                    status: code === 'BLOB_IDEMPOTENCY_CONFLICT' ? 'version_conflict' : 'failed',
                    error: code === 'BLOB_IDEMPOTENCY_CONFLICT' || code === 'BLOB_CATALOG_FAILED'
                        ? code : 'BLOB_STORE_FAILED' });
            }
        }
        return Object.freeze({ outcomes: Object.freeze(outcomes),
            next: candidates.length === this.batchSize
                ? BlobMaintenanceCursor.next(scope, candidates[candidates.length - 1]) : undefined });
    }
}
exports.SqliteBlobMaintenanceService = SqliteBlobMaintenanceService;
//# sourceMappingURL=maintenance-service.js.map