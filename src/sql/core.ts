export type LogicalColumnType =
  | 'boolean'
  | 'double'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'json'
  | 'integer'
  | 'text';

export type ColumnSchema = {
  columnName: string;
  logicalType: LogicalColumnType;
  decode: 'string' | 'number' | 'date' | 'native';
};

export type EntitySchema = {
  table: string;
  columns: Record<string, ColumnSchema>;
  relations?: Record<string, RelationSchema>;
};

export type RelationSchema = {
  targetEntity: string;
  localKey: string;
  foreignKey: string;
  many: boolean;
};

export type SqlQueryResult = {
  rows: any[];
  rowCount: number;
};

export interface SqlSession {
  query(sql: string, values?: any[]): Promise<SqlQueryResult>;
}

export interface TeaQLSqlDriver extends SqlSession {
  stream(sql: string, values?: any[]): AsyncIterable<any>;
  identifier(value: string): string;
  placeholder(index: number): string;
  encode(value: any, column?: ColumnSchema): any;
  contains(columnSql: string, placeholder: string): string;
  aggregateFunction(name: string): string;
  ensureSchema(schemas: Record<string, EntitySchema>): Promise<void>;
  transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
  nextId(session: SqlSession, entity: string): Promise<string>;
  close(): Promise<void>;
}

export interface TeaQLDataService {
  executeMutation(mutation: any): Promise<any>;
  executeQuery<T = any>(query: any): Promise<T[]>;
  executeForStream<T = any>(query: any, chunkSize?: number): AsyncIterable<T[]>;
  close?(): Promise<void>;
}

type NormalizedAggregate = { func: string; field: string; retName: string };
type NormalizedOrder = { field: string; direction: string };

export abstract class AbstractSQLTeaQLClient implements TeaQLDataService {
  private schemaReady?: Promise<void>;
  public readonly sqlTrace: string[] = [];
  private readonly internalQueryToken = Symbol('teaql-internal-query');
  private readonly auditEvents: Readonly<Record<string, unknown>>[] = [];
  private auditSink?: (event: Readonly<Record<string, unknown>>) => void | Promise<void>;

  protected constructor(
    protected readonly driver: TeaQLSqlDriver,
    private readonly schemas: Record<string, EntitySchema>,
  ) {}

  private schema(entity: string): EntitySchema {
    const schema = this.schemas[entity];
    if (!schema) throw new Error(`Unknown TeaQL entity: ${entity}`);
    return schema;
  }

  private encode(value: any, column?: ColumnSchema): any {
    const normalized = value?.id ?? value;
    if (normalized === undefined) return undefined;
    return this.driver.encode(normalized, column);
  }

  private decodeRow(entity: string, row: any, aggregateNames: string[] = []): any {
    const schema = this.schema(entity);
    const result = { ...row };
    for (const [field, column] of Object.entries(schema.columns)) {
      const value = result[field];
      if (value === null || value === undefined) continue;
      if (column.decode === 'number') result[field] = Number(value);
      if (column.decode === 'string') result[field] = String(value);
      if (column.decode === 'date' && value instanceof Date) {
        result[field] = value.toISOString();
      }
      if (column.logicalType === 'boolean') result[field] = Boolean(value);
    }
    for (const name of aggregateNames) {
      if (result[name] !== null && result[name] !== undefined) {
        result[name] = Number(result[name]);
      }
    }
    return result;
  }

  get auditTrace(): ReadonlyArray<Readonly<Record<string, unknown>>> {
    return [...this.auditEvents];
  }

  setAuditSink(sink: (event: Readonly<Record<string, unknown>>) => void | Promise<void>): this {
    this.auditSink = sink;
    return this;
  }

  async ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.driver.ensureSchema(this.schemas);
    }
    return this.schemaReady;
  }

  async executeMutation(mutation: any): Promise<any> {
    if (!String(mutation?.comment || '').trim()) {
      throw new Error('Security audit failure: audit reason is required before mutation');
    }
    await this.ensureSchema();
    const schema = this.schema(mutation.entity);
    const table = this.driver.identifier(schema.table);
    const result = await this.driver.transaction(async session => {
      if (mutation.action === 'Create') {
        const id = mutation.id
          ? String(mutation.id)
          : await this.driver.nextId(session, mutation.entity);
        const version = Number(mutation.version || 0) + 1;
        const record = { ...mutation.payload, id, version };
        const fields = Object.keys(schema.columns)
          .filter(field => record[field] !== undefined);
        const columns = fields.map(field =>
          this.driver.identifier(schema.columns[field].columnName),
        ).join(', ');
        const placeholders = fields.map((_, index) =>
          this.driver.placeholder(index + 1),
        ).join(', ');
        const values = fields.map(field =>
          this.encode(record[field], schema.columns[field]),
        );
        await session.query(
          `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
          values,
        );
        return { success: true, id, version };
      }

      if (mutation.action === 'Update') {
        const fields = Object.keys(schema.columns).filter(field =>
          field !== 'id' && field !== 'version' &&
          mutation.payload[field] !== undefined,
        );
        const values = fields.map(field =>
          this.encode(mutation.payload[field], schema.columns[field]),
        );
        const assignments = fields.map((field, index) =>
          `${this.driver.identifier(schema.columns[field].columnName)} = ` +
          this.driver.placeholder(index + 1),
        );
        const versionColumn = this.driver.identifier('version');
        assignments.push(`${versionColumn} = ${versionColumn} + 1`);
        values.push(String(mutation.id));
        const predicates = [
          `${this.driver.identifier('id')} = ${this.driver.placeholder(values.length)}`,
        ];
        if (mutation.version !== undefined && mutation.version !== null) {
          values.push(Number(mutation.version));
          predicates.push(
            `${versionColumn} = ${this.driver.placeholder(values.length)}`,
          );
        }
        const result = await session.query(
          `UPDATE ${table} SET ${assignments.join(', ')} ` +
          `WHERE ${predicates.join(' AND ')}`,
          values,
        );
        if (result.rowCount !== 1) {
          throw new Error(
            `Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`,
          );
        }
        const versionResult = await session.query(
          `SELECT ${versionColumn} AS ${versionColumn} FROM ${table} WHERE ` +
          `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`,
          [String(mutation.id)],
        );
        return {
          success: true,
          id: String(mutation.id),
          version: Number(versionResult.rows[0].version),
        };
      }

      if (mutation.action === 'Delete') {
        const values: any[] = [String(mutation.id)];
        const predicates = [
          `${this.driver.identifier('id')} = ${this.driver.placeholder(1)}`,
        ];
        if (mutation.version !== undefined && mutation.version !== null) {
          values.push(Number(mutation.version));
          predicates.push(
            `${this.driver.identifier('version')} = ` +
            this.driver.placeholder(values.length),
          );
        }
        const result = await session.query(
          `DELETE FROM ${table} WHERE ${predicates.join(' AND ')}`,
          values,
        );
        if (result.rowCount !== 1) {
          throw new Error(
            `Optimistic lock failed or ${mutation.entity}(${mutation.id}) does not exist`,
          );
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
    if (this.auditSink) await this.auditSink(event);
    return result;
  }

  private compileExpression(
    expression: any,
    schema: EntitySchema,
    values: any[],
  ): string {
    if (Array.isArray(expression?.$and)) {
      const parts = expression.$and.map((item: any) =>
        this.compileExpression(item, schema, values),
      );
      return `(${parts.join(' AND ')})`;
    }
    const parts = Object.entries(expression || {}).map(
      ([field, predicate]: [string, any]) => {
        const column = schema.columns[field];
        if (!column) throw new Error(`Unknown field ${field} for SQL query`);
        const quotedField = this.driver.identifier(column.columnName);
        if (predicate?.$eq !== undefined) {
          const value = predicate.$eq?.id ?? predicate.$eq;
          if (value === null) return `${quotedField} IS NULL`;
          values.push(this.encode(value, column));
          return `${quotedField} = ${this.driver.placeholder(values.length)}`;
        }
        if (predicate?.$contains !== undefined) {
          values.push(String(predicate.$contains));
          return this.driver.contains(
            quotedField,
            this.driver.placeholder(values.length),
          );
        }
        if (Array.isArray(predicate?.$in)) {
          if (!predicate.$in.length) return 'FALSE';
          const placeholders = predicate.$in.map((value: any) => {
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
        throw new Error(`Unsupported query predicate for ${field}`);
      },
    );
    return parts.length ? `(${parts.join(' AND ')})` : 'TRUE';
  }

  private filters(query: any): any[] {
    if (Array.isArray(query._filters) && query._filters.length) return query._filters;
    return query.filterCondition ? [query.filterCondition] : [];
  }

  private groupBy(query: any): string[] {
    return query._groupBy || query.groupByItems || [];
  }

  private aggregates(query: any): NormalizedAggregate[] {
    if (Array.isArray(query._aggregates)) return query._aggregates;
    return (query.aggregateItems || []).map((aggregate: any) => ({
      func: aggregate.function,
      field: aggregate.field,
      retName: aggregate.alias,
    }));
  }

  private orders(query: any): NormalizedOrder[] {
    if (Array.isArray(query._orderBy)) {
      return query._orderBy.map((order: any) => ({
        field: order.f,
        direction: order.d,
      }));
    }
    return (query.orderItems || []).map((order: any) => ({
      field: order.field,
      direction: order.direction,
    }));
  }

  private async compileQuery(query: any): Promise<{
    sql: string;
    values: any[];
    aggregateNames: string[];
  }> {
    const internal = query?.[this.internalQueryToken] === true;
    const purpose = query?._purpose ?? query?.purposeText;
    const comment = query?._comment ?? query?.commentText;
    if (!internal && (!String(purpose || '').trim() || !String(comment || '').trim())) {
      throw new Error('Security audit failure: purpose and comment are required before query execution');
    }
    await this.ensureSchema();
    const schema = this.schema(query.entity);
    const values: any[] = [];
    const groupProperties = this.groupBy(query);
    const groupFields = groupProperties.map(field => {
      if (!schema.columns[field]) throw new Error(`Unknown group field: ${field}`);
      return this.driver.identifier(schema.columns[field].columnName);
    });
    const groupProjection = groupProperties.map(field =>
      `${this.driver.identifier(schema.columns[field].columnName)} AS ` +
      this.driver.identifier(field),
    );
    const aggregateNames: string[] = [];
    let projection = Object.entries(schema.columns).map(([field, column]) =>
      `${this.driver.identifier(column.columnName)} AS ${this.driver.identifier(field)}`,
    ).join(', ');
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

    const partitionBy = query.__teaqlPartitionBy as string | undefined;
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
      if (!partitionColumn) throw new Error(`Unknown partition field: ${partitionBy}`);
      const windowOrder = orderClauses.length ? ` ORDER BY ${orderClauses.join(', ')}` : '';
      projection += `, ROW_NUMBER() OVER (PARTITION BY ` +
        `${this.driver.identifier(partitionColumn.columnName)}${windowOrder}) AS ` +
        this.driver.identifier('__teaql_partition_rank');
    }

    let sql = `SELECT ${projection} FROM ${this.driver.identifier(schema.table)}`;
    const filters = this.filters(query);
    if (filters.length) {
      const predicates = filters.map(expression =>
        this.compileExpression(expression, schema, values),
      );
      sql += ` WHERE ${predicates.join(' AND ')}`;
    }
    if (groupFields.length) sql += ` GROUP BY ${groupFields.join(', ')}`;
    const limit = query._limit !== undefined
      ? Number(query._limit)
      : Number(query.limitValue || 0);
    const offset = query._offset !== undefined
      ? Number(query._offset)
      : Number(query.offsetValue || 0);
    if (partitionBy) {
      const rank = this.driver.identifier('__teaql_partition_rank');
      const predicates: string[] = [];
      values.push(offset);
      predicates.push(`${rank} > ${this.driver.placeholder(values.length)}`);
      if (limit > 0) {
        values.push(offset + limit);
        predicates.push(`${rank} <= ${this.driver.placeholder(values.length)}`);
      }
      sql = `SELECT * FROM (${sql}) AS ${this.driver.identifier('__teaql_partitioned')} ` +
        `WHERE ${predicates.join(' AND ')} ORDER BY ${rank}`;
    } else if (orders.length) {
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

  async executeQuery<T = any>(query: any): Promise<T[]> {
    const { sql, values, aggregateNames } = await this.compileQuery(query);
    const result = await this.driver.query(sql, values);
    const rows = result.rows.map(row =>
      this.decodeRow(query.entity, row, aggregateNames),
    );
    await this.enhanceRelations(rows, query);
    return rows as T[];
  }

  async *executeForStream<T = any>(query: any, chunkSize = 1000): AsyncIterable<T[]> {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error('stream chunk size must be a positive integer');
    }
    const { sql, values, aggregateNames } = await this.compileQuery(query);
    let chunk: any[] = [];
    for await (const rawRow of this.driver.stream(sql, values)) {
      chunk.push(this.decodeRow(query.entity, rawRow, aggregateNames));
      if (chunk.length === chunkSize) {
        await this.enhanceRelations(chunk, query);
        yield chunk as T[];
        chunk = [];
      }
    }
    if (chunk.length) {
      await this.enhanceRelations(chunk, query);
      yield chunk as T[];
    }
  }

  private async enhanceRelations(parents: any[], query: any): Promise<void> {
    if (!parents.length || !Array.isArray(query.relations) || !query.relations.length) return;
    const parentSchema = this.schema(query.entity);
    for (const load of query.relations) {
      const relation = parentSchema.relations?.[load.name];
      if (!relation) throw new Error(`Missing relation ${query.entity}.${load.name}`);
      const parentIds = parents
        .map(parent => parent[relation.localKey])
        .filter(value => value !== undefined && value !== null);
      if (!parentIds.length) {
        for (const parent of parents) parent[load.name] = relation.many ? [] : null;
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
      childQuery[this.internalQueryToken] = true;
      childQuery._filters.push({ [relation.foreignKey]: { $in: parentIds } });
      const children = await this.executeQuery<any>(childQuery);
      for (const child of children) delete child.__teaql_partition_rank;
      const buckets = new Map<any, any[]>();
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

  private queryLimit(query: any): number | undefined {
    if (query._limit !== undefined) return Number(query._limit);
    if (query.limitValue !== undefined && Number(query.limitValue) > 0) {
      return Number(query.limitValue);
    }
    return undefined;
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}

export function assertSafeIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return value;
}

export function standardAggregateFunction(name: string): string {
  const functions: Record<string, string> = {
    count: 'COUNT',
    sum: 'SUM',
    avg: 'AVG',
    min: 'MIN',
    max: 'MAX',
  };
  const sqlFunction = functions[String(name).toLowerCase()];
  if (!sqlFunction) throw new Error(`Unsupported aggregate: ${name}`);
  return sqlFunction;
}
