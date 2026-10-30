"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlBlobResponseContributor = void 0;
const object_storage_1 = require("../core/object-storage");
/** Rechecks each current binding before requesting complete URLs from the store. */
class SqlBlobResponseContributor {
    constructor(catalog, authorization, maximumUrlSeconds = 600) {
        this.catalog = catalog;
        this.authorization = authorization;
        this.maximumUrlSeconds = maximumUrlSeconds;
        if (!Number.isSafeInteger(maximumUrlSeconds) || maximumUrlSeconds < 1 || maximumUrlSeconds > 3600) {
            throw new TypeError('BLOB_POLICY_INVALID');
        }
    }
    /** Assembly identity check; wrappers may share the same physical driver. */
    usesCatalog(catalog) {
        return this.catalog.driver === catalog.driver;
    }
    async projectBatch(context, graph, expiresAt) {
        const results = [];
        for (const slot of graph.blobSlots) {
            if (!await this.authorization.authorize(context, slot))
                throw new Error('BLOB_READ_DENIED');
            const record = await this.catalog.currentRead(slot);
            const seconds = expiresAt
                ? Math.min(this.maximumUrlSeconds, Math.floor((expiresAt.getTime() - Date.now()) / 1000) - 1)
                : this.maximumUrlSeconds;
            if (seconds < 1)
                throw new Error('BLOB_REFERENCE_EXPIRED');
            const inline = /^(image\/|audio\/|video\/|application\/pdf$)/.test(record.contentType);
            let signed;
            try {
                signed = await context.objectStorage('prepare authorized Blob view').getReadUrl(new object_storage_1.ObjectKey(record.objectKey), new object_storage_1.ObjectReadUrlOptions(seconds, inline ? 'inline' : 'attachment', record.fileName));
            }
            catch {
                throw new Error('BLOB_SIGN_FAILED');
            }
            results.push(Object.freeze({ url: signed.url, expiresAt: signed.expiresAt }));
        }
        return Object.freeze(results);
    }
}
exports.SqlBlobResponseContributor = SqlBlobResponseContributor;
//# sourceMappingURL=read-service.js.map