"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.standardAggregateFunction = exports.assertSafeIdentifier = exports.AbstractSQLTeaQLClient = void 0;
class AbstractSQLTeaQLClient {
    constructor(driver, schemas) {
        this.driver = driver;
        this.schemas = schemas;
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
    async ensureSchema() {
        if (!this.schemaReady) {
            this.schemaReady = this.driver.ensureSchema(this.schemas);
        }
        return this.schemaReady;
    }
    async executeMutation(mutation) {
        await this.ensureSchema();
        const schema = this.schema(mutation.entity);
        const table = this.driver.identifier(schema.table);
        return this.driver.transaction(async (session) => {
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
                await session.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
                return { success: true, id, version };
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
                const result = await session.query(`UPDATE ${table} SET ${assignments.join(', ')} ` +
                    `WHERE ${predicates.join(' AND ')}`, values);
                if (result.rowCount !== 1) {
                    throw new Error(`Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`);
                }
                const versionResult = await session.query(`SELECT ${versionColumn} AS ${versionColumn} FROM ${table} WHERE ` +
                    `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`, [String(mutation.id)]);
                return {
                    success: true,
                    id: String(mutation.id),
                    version: Number(versionResult.rows[0].version),
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
                const result = await session.query(`DELETE FROM ${table} WHERE ${predicates.join(' AND ')}`, values);
                if (result.rowCount !== 1) {
                    throw new Error(`Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`);
                }
                return { success: true, id: String(mutation.id), deleted: true };
            }
            throw new Error(`Unsupported mutation action: ${mutation.action}`);
        });
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
    async executeQuery(query) {
        await this.ensureSchema();
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
        let sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)}`;
        const filters = this.filters(query);
        if (filters.length) {
            const predicates = filters.map(expression => this.compileExpression(expression, schema, values));
            sql += ` WHERE ${predicates.join(' AND ')}`;
        }
        if (groupFields.length)
            sql += ` GROUP BY ${groupFields.join(', ')}`;
        const orders = this.orders(query);
        if (orders.length) {
            const clauses = orders.map(order => {
                if (!schema.columns[order.field]) {
                    throw new Error(`Unknown order field: ${order.field}`);
                }
                const direction = String(order.direction).toLowerCase() === 'desc'
                    ? 'DESC'
                    : 'ASC';
                return `${this.driver.identifier(schema.columns[order.field].columnName)} ${direction}`;
            });
            sql += ` ORDER BY ${clauses.join(', ')}`;
        }
        const limit = query._limit !== undefined
            ? Number(query._limit)
            : Number(query.limitValue || 0);
        const offset = query._offset !== undefined
            ? Number(query._offset)
            : Number(query.offsetValue || 0);
        if (limit > 0) {
            values.push(limit);
            sql += ` LIMIT ${this.driver.placeholder(values.length)}`;
        }
        if (offset > 0) {
            values.push(offset);
            sql += ` OFFSET ${this.driver.placeholder(values.length)}`;
        }
        const result = await this.driver.query(sql, values);
        return result.rows.map(row => this.decodeRow(query.entity, row, aggregateNames));
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