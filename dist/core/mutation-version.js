"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextEntityVersion = exports.entityVersion = exports.MutationVersionError = void 0;
const checker_1 = require("./checker");
const long_1 = require("./long");
const object_location_1 = require("./object-location");
const MIN = -(1n << 63n), MAX = (1n << 63n) - 1n, SAFE = BigInt(Number.MAX_SAFE_INTEGER);
/** Stable, value-free diagnostics. A rounded number can never recover lost bits. */
class MutationVersionError extends checker_1.CheckException {
    constructor(code, operation = 'mutation') {
        super([{ ruleId: code, location: object_location_1.ObjectLocation.property('version'),
                message: code === 'version_exhausted'
                    ? `${operation} version is exhausted in the signed 64-bit domain`
                    : `${operation} requires an exact version in its permitted lifecycle state` }]);
        this.code = code;
        this.name = 'MutationVersionError';
    }
}
exports.MutationVersionError = MutationVersionError;
/** Normalize only exact inputs. Canonical decimal text is also the wide JSON representation. */
function entityVersion(value) {
    let exact;
    if (typeof value === 'bigint')
        exact = value;
    else if (typeof value === 'number' && Number.isSafeInteger(value))
        exact = BigInt(value);
    else if (typeof value === 'string' && /^(?:0|-?[1-9][0-9]*)$/.test(value))
        exact = BigInt(value);
    else
        throw new MutationVersionError('invalid_type');
    if (exact < MIN || exact > MAX)
        throw new MutationVersionError('invalid_type');
    return exact >= -SAFE && exact <= SAFE ? Number(exact) : (0, long_1.long)(exact);
}
exports.entityVersion = entityVersion;
/** The same checked transitions as Java/Rust. Creation starts at one, never old+one. */
function nextEntityVersion(operation, original) {
    if (operation === 'Create')
        return 1;
    const version = BigInt(entityVersion(original));
    let next;
    switch (operation) {
        case 'Update':
            if (version <= 0n)
                throw new MutationVersionError('invalid_type', operation);
            next = version + 1n;
            break;
        case 'Delete':
            if (version <= 0n)
                throw new MutationVersionError('invalid_type', operation);
            next = -version - 1n;
            break;
        case 'Recover':
            if (version >= 0n)
                throw new MutationVersionError('invalid_type', operation);
            next = -version + 1n;
            break;
        default: throw new MutationVersionError('invalid_type');
    }
    if (next < MIN || next > MAX)
        throw new MutationVersionError('version_exhausted', operation);
    return entityVersion(next);
}
exports.nextEntityVersion = nextEntityVersion;
//# sourceMappingURL=mutation-version.js.map