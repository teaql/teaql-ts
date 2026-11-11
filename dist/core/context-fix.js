"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextFix = void 0;
const checker_1 = require("./checker");
const object_location_1 = require("./object-location");
const entity_root_1 = require("./entity-root");
const loaded_scalar_snapshot_1 = require("./loaded-scalar-snapshot");
const query_snapshot_1 = require("./query-snapshot");
const decimal_1 = require("./decimal");
const long_1 = require("./long");
const local_time_1 = require("./local-time");
// Invocation-owned, out-of-band state. A JSON/payload flag cannot grant Fix.
const frames = new WeakMap();
/** Model-declared automatic Context assignments, independent from Check scope. */
class ContextFix {
    /** @internal Runtime/generated-service entry; never inferred from field names. */
    static run(context, mutation, schema, work) {
        const columns = new Map(Object.entries(schema?.columns ?? {}).map(([name, column]) => [column.modelName ?? name, { ...column }]));
        const hasBusinessChange = () => mutation.action === 'Create' || (mutation.action === 'Update' &&
            Object.entries(mutation.payload ?? {}).some(([field, value]) => {
                if (field === 'id' || field === 'version' || field.startsWith('_'))
                    return false;
                const column = columns.get(field);
                if (column?.createFunction || column?.updateFunction)
                    return false;
                if (!Object.prototype.hasOwnProperty.call(mutation.loadedValues ?? {}, field))
                    return true;
                return new loaded_scalar_snapshot_1.LoadedScalarSnapshot({ [field]: mutation.loadedValues[field] }).changedField({ [field]: value }) !== undefined;
            }));
        const eligible = hasBusinessChange();
        const before = [...columns].filter(([, column]) => column.createFunction || column.updateFunction)
            .map(([field]) => ({ field, present: Object.prototype.hasOwnProperty.call(mutation.payload ?? {}, field), value: (0, query_snapshot_1.snapshotQuery)(mutation.payload?.[field]) }));
        const previous = frames.get(mutation);
        frames.set(mutation, { context, eligible, columns, now: context.getResource('fixTime') });
        try {
            const result = work();
            if (mutation.action === 'Update' && !hasBusinessChange())
                for (const old of before) {
                    if (old.present)
                        mutation.payload[old.field] = (0, query_snapshot_1.snapshotQuery)(old.value);
                    else
                        delete mutation.payload[old.field];
                }
            return result;
        }
        finally {
            if (previous)
                frames.set(mutation, previous);
            else
                frames.delete(mutation);
        }
    }
    static apply(context, mutation, field, functionName, args = []) {
        const frame = frames.get(mutation);
        const invalid = () => new checker_1.CheckException([{ ruleId: 'invalid_type', entityType: String(mutation.entity),
                location: object_location_1.ObjectLocation.property(field), message: `Context Fix failed at ${mutation.entity}.${field}` }]);
        if (!frame || frame.context !== context)
            throw invalid();
        if (!frame.eligible)
            return;
        const column = frame.columns.get(field);
        const declared = mutation.action === 'Create' ? column?.createFunction : column?.updateFunction;
        if (!column || !declared || declared !== functionName)
            throw invalid();
        try {
            const resolver = context.getResource('contextFixResolver');
            let value;
            if (resolver)
                value = resolver(context, Object.freeze({ entity: String(mutation.entity), field, function: functionName,
                    arguments: Object.freeze([...args]), action: mutation.action, now: new Date(frame.now.getTime()) }));
            else if (functionName === 'now')
                value = new Date(frame.now.getTime());
            else if (functionName === 'uniStr') {
                const bytes = new Uint8Array(16);
                globalThis.crypto.getRandomValues(bytes);
                value = (args[0] ?? '') + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            }
            else
                throw invalid();
            if (value instanceof Promise) {
                // A misconfigured async SPI must not produce an unhandled rejection
                // that logs its raw provider error after the located Check has failed.
                void value.catch(() => undefined);
                throw invalid();
            }
            if (!this.validValue(column, value))
                throw invalid();
            mutation.payload[field] = (0, query_snapshot_1.snapshotQuery)(value);
            context.recordFixEvidence({ entityType: String(mutation.entity), modelPath: field,
                source: functionName === 'now' ? 'clock' : 'context', sourceLabel: functionName === 'now' ? 'graphClock' : `contextFunction:${functionName}` });
        }
        catch {
            // Resolver errors may contain raw request secrets. Do not retain causes.
            throw invalid();
        }
    }
    /** @internal Register with a graph's failure actions before publishing Fix. */
    static captureUndo(mutation, schema) {
        if (!(mutation.ledgerRoot instanceof entity_root_1.EntityRoot) || !mutation.ledgerKey)
            return undefined;
        const fields = Object.entries(schema?.columns ?? {}).filter(([, column]) => column.createFunction || column.updateFunction)
            .map(([name, column]) => column.modelName ?? name);
        return fields.length ? mutation.ledgerRoot.captureFields(mutation.ledgerKey, fields) : undefined;
    }
    static validValue(column, value) {
        if (value === null)
            return true; // Required stays a model Check result.
        switch (column.logicalType) {
            case 'text': return typeof value === 'string';
            case 'datetime':
            case 'date': return value instanceof Date && Number.isFinite(value.getTime());
            case 'boolean': return typeof value === 'boolean';
            case 'double': return typeof value === 'number' && Number.isFinite(value);
            case 'integer': return typeof value === 'number' && Number.isSafeInteger(value);
            case 'decimal': return typeof value === 'string' && (0, decimal_1.decimal)(value) === value;
            case 'long': return typeof value === 'string' && (0, long_1.long)(value) === value;
            case 'time': return typeof value === 'string' && (0, local_time_1.localTime)(value) === value;
            case 'json': return value !== undefined && !(value instanceof Promise);
            default: return false;
        }
    }
}
exports.ContextFix = ContextFix;
//# sourceMappingURL=context-fix.js.map