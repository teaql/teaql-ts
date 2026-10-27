"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteBlobMutationParticipant = void 0;
const blob_ref_1 = require("../core/blob-ref");
/** Native SQLite participant; called by executeMutation before its graph commits. */
class SqliteBlobMutationParticipant {
    constructor(catalog, authorization) {
        this.catalog = catalog;
        this.authorization = authorization;
        if (catalog.driver.databaseKind !== 'sqlite')
            throw new Error('BLOB_CAPABILITY_MISSING');
    }
    async apply(context, owner, graph, session, application) {
        if (!Number.isSafeInteger(application.version) || application.version === 0) {
            throw new Error('BLOB_REFERENCE_INVALID');
        }
        let scope;
        try {
            scope = this.authorization.scope(context);
        }
        catch {
            throw new Error('BLOB_BIND_DENIED');
        }
        if (!scope?.trim() || scope !== scope.trim())
            throw new Error('BLOB_BIND_DENIED');
        const fields = Object.entries(application.schema.columns)
            .filter(([, column]) => column.blob)
            .sort(([left], [right]) => left.localeCompare(right));
        for (const [field, column] of fields) {
            const write = application.action === 'Delete' ||
                (application.action === 'Create'
                    ? application.assigned[field] !== undefined
                    : Object.prototype.hasOwnProperty.call(application.assigned, field));
            if (!write)
                continue;
            if (column.blob.entity !== application.entity || column.blob.field !== field) {
                throw new Error('BLOB_REFERENCE_INVALID');
            }
            const assigned = application.assigned[field];
            const next = application.action === 'Delete' ? null : assigned ?? null;
            if (next !== null && !(next instanceof blob_ref_1.BlobRef)) {
                throw new Error('BLOB_REFERENCE_INVALID');
            }
            const persisted = application.persisted[field];
            if (application.action !== 'Delete' &&
                !(next === null ? persisted === null :
                    persisted instanceof blob_ref_1.BlobRef && persisted.equals(next))) {
                throw new Error('BLOB_REFERENCE_INVALID');
            }
            const target = {
                entity: application.entity, entityId: application.id, field,
            };
            let rows;
            try {
                rows = await session.query(`SELECT key, version FROM teaql_blob_binding
          WHERE scope = ? AND entity = ? AND entity_id = ? AND field = ?`, [scope, target.entity, target.entityId, target.field]);
            }
            catch {
                throw new Error('BLOB_CATALOG_FAILED');
            }
            if (rows.rows.length > 1)
                throw new Error('BLOB_CATALOG_FAILED');
            const prior = rows.rows[0];
            const expectedVersion = prior ? Number(prior.version) : 0;
            const previousReference = prior?.key == null ? null : blob_ref_1.BlobRef.fromSQL(prior.key);
            if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0 ||
                application.action === 'Create' && prior ||
                application.action === 'Delete' &&
                    !(persisted === null && previousReference === null ||
                        persisted instanceof blob_ref_1.BlobRef && previousReference?.equals(persisted))) {
                throw new Error('BLOB_BIND_DENIED');
            }
            if (!prior && next === null)
                continue;
            const nextVersion = Math.max(expectedVersion + 1, Math.abs(application.version));
            if (!Number.isSafeInteger(nextVersion) || nextVersion <= expectedVersion) {
                throw new Error('BLOB_REFERENCE_INVALID');
            }
            await this.catalog.bindInGraph(owner, graph, context, {
                target, next, expectedVersion, nextVersion, action: application.action,
            }, this.authorization);
        }
    }
}
exports.SqliteBlobMutationParticipant = SqliteBlobMutationParticipant;
//# sourceMappingURL=mutation-participant.js.map