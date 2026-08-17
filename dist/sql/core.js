"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardAggregateFunction = exports.assertSafeIdentifier = exports.AbstractSQLTeaQLClient = exports.SQLExecutionEvidenceStore = void 0;
class SQLExecutionEvidenceStore {
    constructor() {
        this.mode = 'all';
        this.entries = [];
    }
    record(metadata) {
        const isSelect = metadata.operation === 'select';
        if (this.mode === 'disabled' ||
            (this.mode === 'select' && !isSelect) ||
            (this.mode === 'mutation' && isSelect))
            return;
        this.entries.push(Object.freeze({
            ...metadata,
            parameters: Object.freeze([...metadata.parameters]),
        }));
    }
    setMode(mode) {
        this.mode = mode;
        this.entries = [];
        return this;
    }
    enableAll() { return this.setMode('all'); }
    enableSelect() { return this.setMode('select'); }
    enableMutation() { return this.setMode('mutation'); }
    disable() { return this.setMode('disabled'); }
    snapshot() { return [...this.entries]; }
}
exports.SQLExecutionEvidenceStore = SQLExecutionEvidenceStore;
class AbstractSQLTeaQLClient {
    constructor(driver, schemas) {
        this.driver = driver;
        this.schemas = schemas;
        this.sqlTrace = [];
        this.internalQueryToken = Symbol('teaql-internal-query');
        this.auditEvents = [];
    }
    /** Installs metadata only. Call ensureSchema() explicitly when schema changes are intended. */
    install(module) {
        Object.assign(this.schemas, module.schemas);
        return this;
    }
    schema(entity) {
        const schema = this.schemas[entity];
        if (!schema)
            throw new Error(`Unknown TeaQL entity: ${entity}`);
        return schema;
    }
    encode(value, column) {
        const normalized = value?.id ?? value;
        if (normalized === undefined)
            return undefined;
        return this.driver.encode(normalized, column);
    }
    decodeRow(entity, row, aggregateNames = []) {
        const schema = this.schema(entity);
        const result = { ...row };
        for (const [field, column] of Object.entries(schema.columns)) {
            const value = result[field];
            if (value === null || value === undefined)
                continue;
            if (column.decode === 'number')
                result[field] = Number(value);
            if (column.decode === 'string')
                result[field] = String(value);
            if (column.decode === 'date' && value instanceof Date) {
                result[field] = value.toISOString();
            }
            if (column.logicalType === 'boolean')
                result[field] = Boolean(value);
        }
        for (const name of aggregateNames) {
            if (result[name] !== null && result[name] !== undefined) {
                result[name] = Number(result[name]);
            }
        }
        return result;
    }
    get auditTrace() {
        return [...this.auditEvents];
    }
    setAuditSink(sink) {
        this.auditSink = sink;
        return this;
    }
    setRuntimeTelemetrySink(sink) {
        this.telemetrySink = sink;
        return this;
    }
    recordSQL(operation, parameterizedSQL, parameters, startedAt, resultCount, affectedRows) {
        this.telemetrySink?.record(Object.freeze({
            operation, parameterizedSQL, parameters: Object.freeze([...parameters]),
            elapsedMicros: Math.max(0, (Date.now() - startedAt) * 1000),
            resultCount, affectedRows,
            resultSummary: resultCount !== undefined
                ? `Fetched ${resultCount} rows` : `Affected ${affectedRows ?? 0} rows`,
        }));
    }
    async ensureSchema() {
        if (!this.schemaReady) {
            this.schemaReady = this.driver.ensureSchema(this.schemas);
        }
        return this.schemaReady;
    }
    async executeMutation(mutation) {
        if (!String(mutation?.comment || '').trim()) {
            throw new Error('Security audit failure: audit reason is required before mutation');
        }
        const schema = this.schema(mutation.entity);
        const table = this.driver.identifier(schema.table);
        const result = await this.driver.transaction(async (session) => {
            if (mutation.action === 'Create') {
                const id = mutation.id
                    ? String(mutation.id)
                    : await this.driver.nextId(session, mutation.entity);
                const version = Number(mutation.version || 0) + 1;
                const record = { ...mutation.payload, id, version };
                const fields = Object.keys(schema.columns)
                    .filter(field => record[field] !== undefined);
                const columns = fields.map(field => this.driver.identifier(schema.columns[field].columnName)).join(', ');
                const placeholders = fields.map((_, index) => this.driver.placeholder(index + 1)).join(', ');
                const values = fields.map(field => this.encode(record[field], schema.columns[field]));
                const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
                const startedAt = Date.now();
                const mutationResult = await session.query(sql, values);
                this.recordSQL('insert', sql, values, startedAt, undefined, mutationResult.rowCount);
                return {
                    success: true,
                    id,
                    version,
                    persistedRecord: await this.readPersistedRecord(session, schema, id),
                };
            }
            if (mutation.action === 'Update') {
                const fields = Object.keys(schema.columns).filter(field => field !== 'id' && field !== 'version' &&
                    mutation.payload[field] !== undefined);
                const values = fields.map(field => this.encode(mutation.payload[field], schema.columns[field]));
                const assignments = fields.map((field, index) => `${this.driver.identifier(schema.columns[field].columnName)} = ` +
                    this.driver.placeholder(index + 1));
                const versionColumn = this.driver.identifier('version');
                assignments.push(`${versionColumn} = ${versionColumn} + 1`);
                values.push(String(mutation.id));
                const predicates = [
                    `${this.driver.identifier('id')} = ${this.driver.placeholder(values.length)}`,
                ];
                if (mutation.version !== undefined && mutation.version !== null) {
                    values.push(Number(mutation.version));
                    predicates.push(`${versionColumn} = ${this.driver.placeholder(values.length)}`);
                }
                const sql = `UPDATE ${table} SET ${assignments.join(', ')} ` +
                    `WHERE ${predicates.join(' AND ')}`;
                const startedAt = Date.now();
                const result = await session.query(sql, values);
                this.recordSQL('update', sql, values, startedAt, undefined, result.rowCount);
                if (result.rowCount !== 1) {
                    throw new Error(`Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`);
                }
                const persistedRecord = await this.readPersistedRecord(session, schema, String(mutation.id));
                return {
                    success: true,
                    id: String(mutation.id),
                    version: Number(persistedRecord.version),
                    persistedRecord,
                };
            }
            if (mutation.action === 'Delete') {
                const values = [String(mutation.id)];
                const predicates = [
                    `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`,
                ];
                if (mutation.version !== undefined && mutation.version !== null) {
                    values.push(Number(mutation.version));
                    predicates.push(`${this.driver.identifier('version')} = ` +
                        this.driver.placeholder(values.length));
                }
                const sql = `DELETE FROM ${table} WHERE ${predicates.join(' AND ')}`;
                const startedAt = Date.now();
                const result = await session.query(sql, values);
                this.recordSQL('delete', sql, values, startedAt, undefined, result.rowCount);
                if (result.rowCount !== 1) {
                    throw new Error(`Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`);
                }
                return { success: true, id: String(mutation.id), deleted: true };
            }
            throw new Error(`Unsupported mutation action: ${mutation.action}`);
        });
        const event = Object.freeze({
            entity: mutation.entity,
            action: mutation.action,
            id: String(result.id),
            reason: String(mutation.comment),
            recordedAt: new Date().toISOString(),
        });
        this.auditEvents.push(event);
        if (this.auditSink)
            await this.auditSink(event);
        return result;
    }
    async readPersistedRecord(session, schema, id) {
        const projection = Object.entries(schema.columns).map(([field, column]) => `${this.driver.identifier(column.columnName)} AS ${this.driver.identifier(field)}`).join(', ');
        const result = await session.query(`SELECT ${projection} FROM ${this.driver.identifier(schema.table)} WHERE ` +
            `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`, [id]);
        if (result.rowCount !== 1) {
            throw new Error(`Persisted ${schema.table}(${id}) could not be read back`);
        }
        return this.decodeRowForSchema(schema, result.rows[0]);
    }
    decodeRowForSchema(schema, row) {
        const result = { ...row };
        for (const [field, column] of Object.entries(schema.columns)) {
            const value = result[field];
            if (value === null || value === undefined)
                continue;
            if (column.decode === 'number')
                result[field] = Number(value);
            if (column.decode === 'string')
                result[field] = String(value);
            if (column.decode === 'date' && value instanceof Date)
                result[field] = value.toISOString();
            if (column.logicalType === 'boolean')
                result[field] = Boolean(value);
        }
        return result;
    }
    compileExpression(expression, schema, values) {
        if (Array.isArray(expression?.$and)) {
            const parts = expression.$and.map((item) => this.compileExpression(item, schema, values));
            return `(${parts.join(' AND ')})`;
        }
        const parts = Object.entries(expression || {}).map(([field, predicate]) => {
            const column = schema.columns[field];
            if (!column)
                throw new Error(`Unknown field ${field} for SQL query`);
            const quotedField = this.driver.identifier(column.columnName);
            if (predicate?.$eq !== undefined) {
                const value = predicate.$eq?.id ?? predicate.$eq;
                if (value === null)
                    return `${quotedField} IS NULL`;
                values.push(this.encode(value, column));
                return `${quotedField} = ${this.driver.placeholder(values.length)}`;
            }
            if (predicate?.$contains !== undefined) {
                values.push(String(predicate.$contains));
                return this.driver.contains(quotedField, this.driver.placeholder(values.length));
            }
            if (Array.isArray(predicate?.$in)) {
                if (!predicate.$in.length)
                    return 'FALSE';
                const placeholders = predicate.$in.map((value) => {
                    values.push(this.encode(value?.id ?? value, column));
                    return this.driver.placeholder(values.length);
                });
                return `${quotedField} IN (${placeholders.join(', ')})`;
            }
            if (predicate?.$gte !== undefined) {
                values.push(this.encode(predicate.$gte, column));
                return `${quotedField} >= ${this.driver.placeholder(values.length)}`;
            }
            if (predicate?.$lte !== undefined) {
                values.push(this.encode(predicate.$lte, column));
                return `${quotedField} <= ${this.driver.placeholder(values.length)}`;
            }
            if (predicate?.$gt !== undefined) {
                values.push(this.encode(predicate.$gt, column));
                return `${quotedField} > ${this.driver.placeholder(values.length)}`;
            }
            if (predicate?.$lt !== undefined) {
                values.push(this.encode(predicate.$lt, column));
                return `${quotedField} < ${this.driver.placeholder(values.length)}`;
            }
            throw new Error(`Unsupported query predicate for ${field}`);
        });
        return parts.length ? `(${parts.join(' AND ')})` : 'TRUE';
    }
    filters(query) {
        if (Array.isArray(query._filters) && query._filters.length)
            return query._filters;
        return query.filterCondition ? [query.filterCondition] : [];
    }
    groupBy(query) {
        return query._groupBy || query.groupByItems || [];
    }
    aggregates(query) {
        if (Array.isArray(query._aggregates))
            return query._aggregates;
        return (query.aggregateItems || []).map((aggregate) => ({
            func: aggregate.function,
            field: aggregate.field,
            retName: aggregate.alias,
        }));
    }
    orders(query) {
        if (Array.isArray(query._orderBy)) {
            return query._orderBy.map((order) => ({
                field: order.f,
                direction: order.d,
            }));
        }
        return (query.orderItems || []).map((order) => ({
            field: order.field,
            direction: order.direction,
        }));
    }
    async compileQuery(query) {
        const internal = query?.[this.internalQueryToken] === true;
        const purpose = query?._purpose ?? query?.purposeText;
        const comment = query?._comment ?? query?.commentText;
        if (!internal && (!String(purpose || '').trim() || !String(comment || '').trim())) {
            throw new Error('Security audit failure: purpose and comment are required before query execution');
        }
        const schema = this.schema(query.entity);
        const values = [];
        const groupProperties = this.groupBy(query);
        const groupFields = groupProperties.map(field => {
            if (!schema.columns[field])
                throw new Error(`Unknown group field: ${field}`);
            return this.driver.identifier(schema.columns[field].columnName);
        });
        const groupProjection = groupProperties.map(field => `${this.driver.identifier(schema.columns[field].columnName)} AS ` +
            this.driver.identifier(field));
        const aggregateNames = [];
        let projection = Object.entries(schema.columns).map(([field, column]) => `${this.driver.identifier(column.columnName)} AS ${this.driver.identifier(field)}`).join(', ');
        const aggregates = this.aggregates(query);
        if (aggregates.length) {
            const aggregateProjection = aggregates.map(aggregate => {
                if (!schema.columns[aggregate.field]) {
                    throw new Error(`Unknown aggregate field: ${aggregate.field}`);
                }
                aggregateNames.push(aggregate.retName);
                return `${this.driver.aggregateFunction(aggregate.func)}(` +
                    `${this.driver.identifier(schema.columns[aggregate.field].columnName)}) AS ` +
                    this.driver.identifier(aggregate.retName);
            });
            projection = [...groupProjection, ...aggregateProjection].join(', ');
        }
        const partitionBy = query.__teaqlPartitionBy;
        const orders = this.orders(query);
        const orderClauses = orders.map(order => {
            if (!schema.columns[order.field]) {
                throw new Error(`Unknown order field: ${order.field}`);
            }
            const direction = String(order.direction).toLowerCase() === 'desc'
                ? 'DESC'
                : 'ASC';
            return `${this.driver.identifier(schema.columns[order.field].columnName)} ${direction}`;
        });
        if (partitionBy) {
            const partitionColumn = schema.columns[partitionBy];
            if (!partitionColumn)
                throw new Error(`Unknown partition field: ${partitionBy}`);
            const windowOrder = orderClauses.length ? ` ORDER BY ${orderClauses.join(', ')}` : '';
            projection += `, ROW_NUMBER() OVER (PARTITION BY ` +
                `${this.driver.identifier(partitionColumn.columnName)}${windowOrder}) AS ` +
                this.driver.identifier('__teaql_partition_rank');
        }
        let sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)}`;
        const filters = this.filters(query);
        if (filters.length) {
            const predicates = filters.map(expression => this.compileExpression(expression, schema, values));
            sql += ` WHERE ${predicates.join(' AND ')}`;
        }
        if (groupFields.length)
            sql += ` GROUP BY ${groupFields.join(', ')}`;
        const limit = query._limit !== undefined
            ? Number(query._limit)
            : Number(query.limitValue || 0);
        const offset = query._offset !== undefined
            ? Number(query._offset)
            : Number(query.offsetValue || 0);
        if (partitionBy) {
            const rank = this.driver.identifier('__teaql_partition_rank');
            const predicates = [];
            values.push(offset);
            predicates.push(`${rank} > ${this.driver.placeholder(values.length)}`);
            if (limit > 0) {
                values.push(offset + limit);
                predicates.push(`${rank} <= ${this.driver.placeholder(values.length)}`);
            }
            sql = `SELECT * FROM (${sql}) AS ${this.driver.identifier('__teaql_partitioned')} ` +
                `WHERE ${predicates.join(' AND ')} ORDER BY ${rank}`;
        }
        else if (orders.length) {
            sql += ` ORDER BY ${orderClauses.join(', ')}`;
        }
        if (!partitionBy && limit > 0) {
            values.push(limit);
            sql += ` LIMIT ${this.driver.placeholder(values.length)}`;
        }
        if (!partitionBy && offset > 0) {
            values.push(offset);
            sql += ` OFFSET ${this.driver.placeholder(values.length)}`;
        }
        this.sqlTrace.push(sql);
        return { sql, values, aggregateNames };
    }
    async executeQuery(query) {
        const internal = query?.[this.internalQueryToken] === true;
        if (!internal) {
            if (typeof query?.prepareForList !== 'function') {
                throw new Error('TeaQL list execution requires the formal runtime SelectQuery');
            }
            query.prepareForList();
        }
        const prepared = internal ? { query, execution: undefined } : await this.prepareContinuousPage(query);
        query = prepared.query;
        const { sql, values, aggregateNames } = await this.compileQuery(query);
        const startedAt = Date.now();
        const result = await this.driver.query(sql, values);
        this.recordSQL('select', sql, values, startedAt, result.rowCount);
        const rows = result.rows.map(row => this.decodeRow(query.entity, row, aggregateNames));
        await this.enhanceRelations(rows, query);
        if (!internal)
            await this.registerContinuousPage(query, prepared.execution, rows);
        return rows;
    }
    async executeCount(query) {
        if (typeof query?.forExactCount !== 'function') {
            throw new Error('TeaQL exact count requires the formal runtime SelectQuery');
        }
        const alias = '__teaql_total';
        const rows = await this.executeQuery(query.forExactCount(alias));
        const value = rows[0]?.[alias];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error(`TeaQL provider did not return exact count alias ${alias}`);
        }
        return value;
    }
    async prepareContinuousPage(query) {
        const options = query.localContinuousPageOptions?.();
        const runtime = query.localContinuousPageRuntime?.();
        if (!options || !runtime) {
            runtime?.observe('DISABLED');
            return { query };
        }
        const orders = this.orders(query);
        const limit = this.queryLimit(query);
        if (!limit || orders.length !== 1 || orders[0].field !== 'id' || this.aggregates(query).length || this.groupBy(query).length || query.__teaqlPartitionBy) {
            runtime.observe('OFFSET_FALLBACK:UNSUPPORTED_QUERY_SHAPE');
            return { query };
        }
        const clone = Object.assign(Object.create(Object.getPrototypeOf(query)), query);
        clone.orderItems = [...(query.orderItems || [])];
        clone.relations = [...(query.relations || [])];
        Object.defineProperty(clone, 'continuousPageFetchOptions', { enumerable: false, writable: true, value: options });
        Object.defineProperty(clone, 'continuousPageRuntimeContext', { enumerable: false, writable: true, value: runtime });
        const offset = Number(query.offsetValue || query._offset || 0);
        const normalized = { ...JSON.parse(JSON.stringify(clone)), offsetValue: 0, _offset: 0, commentText: undefined, purposeText: undefined };
        const rawKey = `${options.namespace}|${runtime.owner}|${JSON.stringify(normalized)}`;
        let hash = 2166136261;
        for (let i = 0; i < rawKey.length; i++)
            hash = Math.imul(hash ^ rawKey.charCodeAt(i), 16777619);
        const queryKey = `teaql:continuous-page:v1:${(hash >>> 0).toString(16)}`;
        const execution = { queryKey, offset, limit, direction: String(orders[0].direction).toLowerCase(), ttlSeconds: options.ttlSeconds, runtime, optimized: false };
        if (offset === 0) {
            runtime.observe('OFFSET_FALLBACK:FIRST_PAGE');
            return { query: clone, execution };
        }
        let cursor;
        try {
            cursor = await runtime.get(queryKey, offset);
        }
        catch {
            runtime.observe('OFFSET_FALLBACK:STORE_UNAVAILABLE');
            return { query: clone, execution };
        }
        if (!cursor) {
            runtime.observe('OFFSET_FALLBACK:CACHE_MISS');
            return { query: clone, execution };
        }
        const seek = { id: { [execution.direction === 'desc' ? '$lt' : '$gt']: cursor.boundary } };
        clone.filterCondition = clone.filterCondition ? { $and: [clone.filterCondition, seek] } : seek;
        clone.offsetValue = 0;
        if (clone._offset !== undefined)
            clone._offset = 0;
        execution.optimized = true;
        execution.cursorId = cursor.cursorId;
        runtime.observe('CURSOR_SEEK', cursor.cursorId);
        return { query: clone, execution };
    }
    async registerContinuousPage(_query, execution, rows) {
        if (!execution || rows.length !== execution.limit || !rows.length || rows[rows.length - 1].id === undefined)
            return;
        try {
            await execution.runtime.put(execution.queryKey, execution.offset + rows.length, {
                cursorId: `cpg_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`,
                boundary: rows[rows.length - 1].id,
                expiresAt: Date.now() + execution.ttlSeconds * 1000,
            });
        }
        catch {
            execution.runtime.observe('OFFSET_FALLBACK:STORE_UNAVAILABLE');
            return;
        }
        if (execution.optimized)
            execution.runtime.observe('CURSOR_SEEK', execution.cursorId);
    }
    async *executeForStream(query, chunkSize = 1000) {
        if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
            throw new Error('stream chunk size must be a positive integer');
        }
        const { sql, values, aggregateNames } = await this.compileQuery(query);
        let chunk = [];
        for await (const rawRow of this.driver.stream(sql, values)) {
            chunk.push(this.decodeRow(query.entity, rawRow, aggregateNames));
            if (chunk.length === chunkSize) {
                await this.enhanceRelations(chunk, query);
                yield chunk;
                chunk = [];
            }
        }
        if (chunk.length) {
            await this.enhanceRelations(chunk, query);
            yield chunk;
        }
    }
    async enhanceRelations(parents, query) {
        if (!parents.length || !Array.isArray(query.relations) || !query.relations.length)
            return;
        const parentSchema = this.schema(query.entity);
        for (const load of query.relations) {
            const relation = parentSchema.relations?.[load.name];
            if (!relation)
                throw new Error(`Missing relation ${query.entity}.${load.name}`);
            const parentIds = parents
                .map(parent => parent[relation.localKey])
                .filter(value => value !== undefined && value !== null);
            if (!parentIds.length) {
                for (const parent of parents)
                    parent[load.name] = relation.many ? [] : null;
                continue;
            }
            const childQuery = {
                ...(load.query || {}),
                entity: relation.targetEntity,
                _filters: [...this.filters(load.query || {})],
                relations: [...(load.query?.relations || [])],
                __teaqlPartitionBy: load.query && this.queryLimit(load.query) !== undefined
                    ? relation.foreignKey
                    : undefined,
            };
            if (typeof childQuery.clearContinuousPageRuntime === 'function')
                childQuery.clearContinuousPageRuntime();
            childQuery[this.internalQueryToken] = true;
            childQuery._filters.push({ [relation.foreignKey]: { $in: parentIds } });
            const children = await this.executeQuery(childQuery);
            for (const child of children)
                delete child.__teaql_partition_rank;
            const buckets = new Map();
            for (const child of children) {
                const key = child[relation.foreignKey];
                const bucket = buckets.get(key) || [];
                bucket.push(child);
                buckets.set(key, bucket);
            }
            for (const parent of parents) {
                const related = buckets.get(parent[relation.localKey]) || [];
                parent[load.name] = relation.many ? related : (related[0] ?? null);
            }
        }
    }
    queryLimit(query) {
        if (query._limit !== undefined)
            return Number(query._limit);
        if (query.limitValue !== undefined && Number(query.limitValue) > 0) {
            return Number(query.limitValue);
        }
        return undefined;
    }
    async close() {
        await this.driver.close();
    }
}
exports.AbstractSQLTeaQLClient = AbstractSQLTeaQLClient;
function assertSafeIdentifier(value) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        throw new Error(`Unsafe SQL identifier: ${value}`);
    }
    return value;
}
exports.assertSafeIdentifier = assertSafeIdentifier;
function standardAggregateFunction(name) {
    const functions = {
        count: 'COUNT',
        sum: 'SUM',
        avg: 'AVG',
        min: 'MIN',
        max: 'MAX',
    };
    const sqlFunction = functions[String(name).toLowerCase()];
    if (!sqlFunction)
        throw new Error(`Unsupported aggregate: ${name}`);
    return sqlFunction;
}
exports.standardAggregateFunction = standardAggregateFunction;
//# sourceMappingURL=core.js.map