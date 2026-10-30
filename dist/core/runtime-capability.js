"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRuntimeCapabilities = exports.installRuntimeCapability = void 0;
const slot = (name) => `teaql.runtime.capability:${name}`;
function installRuntimeCapability(context, resource) {
    if (!resource || !resource.name?.trim() || typeof resource.assertReady !== 'function') {
        throw new TypeError('Invalid runtime capability resource');
    }
    if (context.getResource(slot(resource.name)))
        throw new Error('Duplicate runtime capability');
    context.insertResource(slot(resource.name), resource);
}
exports.installRuntimeCapability = installRuntimeCapability;
function requireRuntimeCapabilities(context, required) {
    for (const name of required) {
        const resource = context.getResource(slot(name));
        if (!resource || resource.name !== name) {
            throw new Error(name === 'blob.v1' ? 'BLOB_CAPABILITY_MISSING'
                : name === 'secure_document.v1' ? 'DOCUMENT_CONFIGURATION' : 'RUNTIME_CAPABILITY_MISSING');
        }
        resource.assertReady(context);
    }
}
exports.requireRuntimeCapabilities = requireRuntimeCapabilities;
//# sourceMappingURL=runtime-capability.js.map