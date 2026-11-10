"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInteger32Schemas = exports.ModeledInteger32Layout = exports.integer32Error = void 0;
const checker_1 = require("./checker");
const object_location_1 = require("./object-location");
/** Value-free, canonical failure shared by generated native/JSON/E paths. */
function integer32Error(value, entityType, field) {
    if (value === null || value === undefined || typeof value === 'number' && Number.isInteger(value)
        && value >= -2147483648 && value <= 2147483647)
        return undefined;
    return new checker_1.CheckException([{ ruleId: 'invalid_type', entityType, location: object_location_1.ObjectLocation.property(field),
            message: `Invalid field ${field}: expected an exact signed 32-bit Integer` }]);
}
exports.integer32Error = integer32Error;
/** @internal Capture trusted width metadata before custom Fix can mutate it. */
class ModeledInteger32Layout {
    constructor(entityType, schema) {
        this.entityType = entityType;
        const fields = [];
        for (const [native, column] of Object.entries(schema?.columns ?? {})) {
            if (column.integer32 !== undefined && typeof column.integer32 !== 'boolean')
                throw new TypeError('INVALID_INTEGER32_METADATA');
            if (!column.integer32)
                continue;
            const canonical = column.modelName ?? native;
            if (column.logicalType !== 'integer' || column.decode !== 'number' || ['id', 'version'].includes(native)
                || ['id', 'version'].includes(canonical) || Object.values(schema?.relations ?? {}).some(r => !r.many && r.localKey === native)) {
                throw new TypeError(`INVALID_INTEGER32_METADATA: ${entityType}.${canonical}`);
            }
            fields.push(Object.freeze({ native, canonical, column: column.columnName }));
        }
        this.fields = Object.freeze(fields);
        Object.freeze(this);
    }
    /** Validates canonical mutation values without coercion or modifying intent. */
    checkMutation(payload, results = []) {
        for (const field of this.fields) {
            const error = integer32Error(payload[field.canonical], this.entityType, field.canonical);
            if (error && !results.some(r => r.ruleId === 'invalid_type' && r.location.modelPath() === field.canonical))
                results.push(...error.violations);
        }
        return results;
    }
    /** SQL may return an exact bigint for INTEGER; normalize before Number(...).
     * Native/text/bool coercion is deliberately not an Integer conversion. */
    read(fieldName, value) {
        const field = this.fields.find(f => f.native === fieldName);
        if (!field || value == null)
            return value;
        if (typeof value === 'bigint' && value >= -2147483648n && value <= 2147483647n)
            return Number(value);
        const error = integer32Error(value, this.entityType, field.canonical);
        if (error)
            throw error;
        return value;
    }
}
exports.ModeledInteger32Layout = ModeledInteger32Layout;
/** @internal Runtime modules validate all widths before any installation. */
function validateInteger32Schemas(schemas) {
    for (const [name, schema] of Object.entries(schemas))
        new ModeledInteger32Layout(name, schema);
}
exports.validateInteger32Schemas = validateInteger32Schemas;
//# sourceMappingURL=modeled-integer32.js.map