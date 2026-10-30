"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeBlobContentVerifier = void 0;
/** A passive host-selected routing table for independently optional parsers. */
class CompositeBlobContentVerifier {
    constructor(routes) {
        if (!routes || typeof routes !== 'object')
            throw new Error('BLOB_POLICY_INVALID');
        const entries = Object.entries(routes);
        if (entries.length === 0 || entries.length > 32 || entries.some(([extension, verifier]) => !/^[a-z0-9]{1,16}$/.test(extension) || !verifier ||
            typeof verifier.verify !== 'function')) {
            throw new Error('BLOB_POLICY_INVALID');
        }
        this.routes = new Map(entries);
    }
    get supportedExtensions() {
        return Object.freeze([...this.routes.keys()].sort());
    }
    async validateReady() {
        for (const verifier of new Set(this.routes.values())) {
            await verifier.validateReady?.();
        }
    }
    async verify(content, extension, maximumBytes) {
        const verifier = this.routes.get(extension);
        if (!verifier)
            throw new Error('BLOB_FORMAT_NOT_ALLOWED');
        return verifier.verify(content, extension, maximumBytes);
    }
}
exports.CompositeBlobContentVerifier = CompositeBlobContentVerifier;
//# sourceMappingURL=content-composite.js.map