"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retainSubmittedPaths = exports.encodeWireOutput = exports.normalizeWireInput = exports.createWireEntityMetadata = exports.WireInputError = void 0;
const object_location_1 = require("./object-location");
class WireInputError extends Error {
    constructor(code, instancePath, message) {
        super(message);
        this.code = code;
        this.instancePath = instancePath;
        this.name = 'WireInputError';
    }
}
exports.WireInputError = WireInputError;
function createWireEntityMetadata(entityType, canonicalFields, profile = 'camelCase', aliases = {}) {
    const fields = {};
    const spellings = new Map();
    for (const canonicalName of canonicalFields) {
        const wireName = (0, object_location_1.renderJsonFieldName)(canonicalName, profile);
        const fieldAliases = [...(aliases[canonicalName] ?? [])];
        for (const spelling of [wireName, ...fieldAliases]) {
            const existing = spellings.get(spelling);
            if (existing && existing !== canonicalName) {
                throw new Error(`Wire field spelling '${spelling}' maps to both '${existing}' and '${canonicalName}'`);
            }
            spellings.set(spelling, canonicalName);
        }
        fields[canonicalName] = Object.freeze({
            canonicalName,
            wireName,
            aliases: Object.freeze(fieldAliases),
        });
    }
    return Object.freeze({ entityType, profile, fields: Object.freeze(fields) });
}
exports.createWireEntityMetadata = createWireEntityMetadata;
/**
 * Normalize one JSON object before checker or mutation execution.
 *
 * No serializer naming policy is consulted. The generated field map is the
 * complete authority, and two submitted spellings for one canonical field are
 * always rejected, even when their values happen to be equal.
 */
function normalizeWireInput(input, metadata, parentPointer = '') {
    const lookup = new Map();
    for (const field of Object.values(metadata.fields)) {
        lookup.set(field.wireName, field);
        for (const alias of field.aliases)
            lookup.set(alias, field);
    }
    const values = {};
    const sourceInstancePaths = {};
    const submitted = new Map();
    for (const [submittedName, value] of Object.entries(input)) {
        const pointer = `${parentPointer}/${escapeJsonPointer(submittedName)}`;
        const field = lookup.get(submittedName);
        if (!field) {
            throw new WireInputError('WIRE_UNKNOWN_FIELD', pointer, `Unknown ${metadata.entityType} field '${submittedName}'`);
        }
        const previous = submitted.get(field.canonicalName);
        if (previous !== undefined) {
            throw new WireInputError('WIRE_FIELD_COLLISION', pointer, `Fields '${previous}' and '${submittedName}' both map to canonical field '${field.canonicalName}'`);
        }
        submitted.set(field.canonicalName, submittedName);
        values[field.canonicalName] = value;
        if (submittedName !== field.wireName) {
            sourceInstancePaths[field.canonicalName] = pointer;
        }
    }
    return Object.freeze({
        values: Object.freeze(values),
        sourceInstancePaths: Object.freeze(sourceInstancePaths),
    });
}
exports.normalizeWireInput = normalizeWireInput;
/** Render canonical mutation values to the selected external profile. */
function encodeWireOutput(values, metadata) {
    const output = {};
    for (const [canonicalName, value] of Object.entries(values)) {
        const field = metadata.fields[canonicalName];
        if (!field) {
            throw new Error(`Unknown canonical ${metadata.entityType} field '${canonicalName}'`);
        }
        output[field.wireName] = value;
    }
    return Object.freeze(output);
}
exports.encodeWireOutput = encodeWireOutput;
/** Add submitted alias provenance to checker results without changing location identity. */
function retainSubmittedPaths(results, normalized) {
    return results.map(result => {
        const firstProperty = result.location.segments.find(segment => segment.kind === 'property');
        if (!firstProperty || firstProperty.kind !== 'property')
            return { ...result };
        const sourceInstancePath = normalized.sourceInstancePaths[firstProperty.name];
        return sourceInstancePath === undefined ? { ...result } : { ...result, sourceInstancePath };
    });
}
exports.retainSubmittedPaths = retainSubmittedPaths;
function escapeJsonPointer(value) {
    return value.replace(/~/g, '~0').replace(/\//g, '~1');
}
//# sourceMappingURL=wire-fields.js.map