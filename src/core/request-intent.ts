import type { MutationQuery, SelectQuery } from './ast';
import { cloneTraceNodes, queryTraceSource, TraceNode, MutationTraceScope, mutationScopeForEntity } from './trace-chain';
import type { EntityKey, EntityRoot } from './entity-root';
import { inheritSQLLogBindings, logValueStrings, privateLogValueStrings, scrubLogText } from './log-privacy';
import type { SQLLogBindingSource } from './log-privacy';
import { snapshotQuery, queryExecutionOwner, retainQueryExecutionOwner } from './query-snapshot';
import { LoadedScalarSnapshot } from './loaded-scalar-snapshot';

const mutationSnapshots = new WeakMap<object, LoadedScalarSnapshot>();

// Only runtime-created snapshots carry provenance. No property supplied by a
// JSON/builder caller can forge it, and no mutable trace stack lives on Context.
const querySources = new WeakMap<object, readonly TraceNode[]>();
const graphRequests = new WeakMap<object, { session: GraphMutationSession;
  parent?: MutationTraceScope; localComment?: string }>();
const scopeOwners = new WeakMap<MutationTraceScope, GraphMutationSession>();

export type QueryOperation = Readonly<{
  kind: 'named-count' | 'facet' | 'relation-count' | 'relation-select' | 'aggregate' | 'pagination';
  /** Exact generator-supplied native method; absent for a low-level runtime operation. */
  method?: string;
  alias?: string;
  relation?: string;
}>;

function operationSnapshot(operation: QueryOperation): QueryOperation {
  if (!['named-count', 'facet', 'relation-count', 'relation-select', 'aggregate', 'pagination'].includes(operation.kind)
    || (operation.method !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(operation.method))
    || (operation.alias !== undefined && typeof operation.alias !== 'string')
    || (operation.relation !== undefined && typeof operation.relation !== 'string')) {
    throw new Error('QUERY_OPERATION_INVALID: invalid generated operation descriptor');
  }
  return Object.freeze({ kind: operation.kind, method: operation.method,
    alias: operation.alias, relation: operation.relation });
}

/** One native literal renderer for all count/facet aliases. Never parse SQL. */
export function queryOperationComment(operation: QueryOperation): string {
  const captured = operationSnapshot(operation);
  const literal = (value: string) => "'" + value.replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + "'";
  if (!captured.method) return 'framework: ' + captured.kind
    + (captured.relation ? ' ' + captured.relation : '')
    + (captured.alias !== undefined ? ' ' + literal(captured.alias) : '');
  return captured.method + '(' + (captured.alias !== undefined ? literal(captured.alias)
    : captured.kind === 'relation-select' ? '...' : '') + ')';
}

const requestBindingToken = Symbol('runtime request binding');
type QueryBinding = {
  [requestBindingToken]: true;
  parent?: QueryRequest<any>;
  comment: string;
  name: string;
  operation?: QueryOperation;
  source: readonly TraceNode[];
  invocation?: object;
};

export type RequestKind = 'query' | 'mutation';

/** Stable, value-free request-boundary diagnostics. */
export class RequestIntentError extends Error {
  constructor(
    public readonly code: 'REQUEST_COMMENT_REQUIRED' | 'QUERY_PURPOSE_REQUIRED',
    public readonly field: 'comment' | 'purpose',
    public readonly requestKind: RequestKind,
  ) {
    super(`${code}: ${requestKind} request requires a non-blank ${field}; supply it at the request entry point`);
    this.name = 'RequestIntentError';
  }
}

// Match Rust str::trim (Unicode White_Space), not JavaScript trim: NEL is
// whitespace, while BOM is not. Validate but never trim the supplied text.
function requireText(value: unknown, field: 'comment' | 'purpose', kind: RequestKind): string {
  if (typeof value !== 'string' || /^\p{White_Space}*$/u.test(value)) {
    throw new RequestIntentError(
      field === 'comment' ? 'REQUEST_COMMENT_REQUIRED' : 'QUERY_PURPOSE_REQUIRED', field, kind,
    );
  }
  return value;
}

export class QueryIntent {
  readonly #comment: string;
  readonly #purpose: string;

  constructor(comment: unknown, purpose: unknown) {
    this.#comment = requireText(comment, 'comment', 'query');
    this.#purpose = requireText(purpose, 'purpose', 'query');
    Object.freeze(this);
  }

  get comment(): string { return this.#comment; }
  get purpose(): string { return this.#purpose; }
}

export class MutationIntent {
  readonly #comment: string;

  constructor(comment: unknown) {
    this.#comment = requireText(comment, 'comment', 'mutation');
    Object.freeze(this);
  }

  get comment(): string { return this.#comment; }
  get auditReason(): string { return this.#comment; }
  readbackIntent(): QueryIntent {
    return new QueryIntent(this.#comment, 'verify persisted mutation result');
  }
}

/**
 * Request intent is owned separately from the mutable query builder. A snapshot
 * retains local, non-enumerable pagination capabilities without serializing them.
 */
export class QueryRequest<T extends object = SelectQuery> {
  readonly #intent: QueryIntent;
  readonly #query: T;
  readonly #parent?: QueryRequest<any>;
  readonly #comment: string;
  readonly #name: string;
  readonly #operation?: QueryOperation;
  readonly #invocation: object;

  constructor(query: T, intent?: QueryIntent, binding?: QueryBinding) {
    const source = query as any;
    this.#intent = intent === undefined
      ? new QueryIntent(source?._comment ?? source?.commentText, source?._purpose ?? source?.purposeText)
      : new QueryIntent(intent?.comment, intent?.purpose);
    if (binding && binding[requestBindingToken] !== true)
      throw new Error('QUERY_REQUEST_OWNERSHIP_INVALID: request binding is runtime-owned');
    const previous = queryExecutionOwner(query);
    const owner = previous instanceof QueryRequest
      && previous.intent.comment === this.#intent.comment
      && previous.purpose === this.#intent.purpose ? previous : undefined;
    this.#invocation = binding?.invocation ?? (binding?.parent ? binding.parent.#invocation : undefined)
      ?? (owner ? owner.#invocation : undefined) ?? Object.freeze({});
    this.#parent = binding ? binding.parent : owner?.parentRequest;
    this.#comment = requireText(binding?.comment ?? owner?.comment ?? this.#intent.comment, 'comment', 'query');
    this.#name = binding?.name ?? owner?.requestName ?? String(source.entity ?? 'query');
    this.#operation = binding?.operation ?? owner?.operation;
    this.#query = snapshotQuery(query);
    const captured = this.#query as any;
    // Internal derivations cannot pick a nested builder's different intent.
    for (const [field, value] of [
      ['commentText', this.intent.comment], ['purposeText', this.purpose],
      ['_comment', this.intent.comment], ['_purpose', this.purpose],
    ] as const) {
      Object.defineProperty(captured, field, { value, enumerable: !field.startsWith('_'),
        configurable: true, writable: false });
    }
    querySources.set(captured, cloneTraceNodes(binding?.source ?? owner?.traceSource ?? querySources.get(query)
      ?? queryTraceSource(String(source.entity), this.intent.comment, this.purpose)));
    retainQueryExecutionOwner(captured, this);
    Object.freeze(this);
  }

  get intent(): QueryIntent { return this.#intent; }
  get query(): T { return this.#query; }
  get comment(): string { return this.#comment; }
  get purpose(): string { return this.#intent.purpose; }
  get traceSource(): readonly TraceNode[] { return querySources.get(this.#query)!; }
  get parentRequest(): QueryRequest<any> | undefined { return this.#parent; }
  get rootRequest(): QueryRequest<any> {
    let root: QueryRequest<any> = this;
    while (root.parentRequest) root = root.parentRequest;
    return root;
  }
  get requestName(): string { return this.#name; }
  get operation(): QueryOperation | undefined { return this.#operation; }
  get traceChain(): readonly TraceNode[] {
    const comments: TraceNode[] = [];
    for (let node: QueryRequest<any> | undefined = this; node; node = node.parentRequest)
      comments.push({ kind: 'comment', name: node.requestName, detail: node.comment });
    return cloneTraceNodes([{ kind: 'purpose', name: this.rootRequest.requestName, detail: this.purpose },
      ...comments.reverse()]);
  }

  /** Runtime derivation preserves this invocation's source across builder clones. */
  withQuery<Q extends object>(query: Q): QueryRequest<Q> {
    const previous = queryExecutionOwner(query);
    if (previous instanceof QueryRequest && previous.#invocation !== this.#invocation) {
      throw new Error('QUERY_SCOPE_OWNER_MISMATCH: replacement belongs to another query invocation');
    }
    return new QueryRequest(query, this.intent, { [requestBindingToken]: true,
      parent: this.parentRequest, comment: this.comment, name: this.requestName,
      operation: this.operation, source: this.traceSource, invocation: this.#invocation });
  }

  /** A real operation child need not execute SQL itself; descendants retain it. */
  deriveOperation<Q extends object>(query: Q, operation: QueryOperation): QueryRequest<Q> {
    const captured = operationSnapshot(operation);
    return new QueryRequest(query, this.intent, { [requestBindingToken]: true,
      parent: this, comment: queryOperationComment(captured), name: String((query as any).entity ?? this.requestName),
      operation: captured, source: this.traceSource });
  }

  /** Local description for work created by the framework, never a root authorization. */
  deriveHelper<Q extends object>(query: Q, comment: string): QueryRequest<Q> {
    return new QueryRequest(query, this.intent, { [requestBindingToken]: true,
      parent: this, comment: requireText(comment, 'comment', 'query'),
      name: String((query as any).entity ?? this.requestName), source: this.traceSource });
  }

  /** Preserve the Q-operation parent and the actual nested request's own comment. */
  derive<Q extends object>(query: Q, relation: string, operation?: QueryOperation): QueryRequest<Q> {
    const parent = this.deriveOperation(this.query, operation ?? { kind: 'relation-select', relation });
    return parent.deriveChild(query, relation);
  }

  /** Aggregates execute their operation; an anonymous template is not a value load. */
  deriveAggregate<Q extends object>(query: Q, relation: string, operation: QueryOperation): QueryRequest<Q> {
    const facet = this.parentRequest?.operation?.kind === 'facet' ? this.parentRequest : undefined;
    const branch = facet
      ? facet.deriveHelper(query, 'aggregate ' + facet.operation!.relation)
      : this.deriveOperation(query, operation);
    const physical = [...this.traceSource, { kind: 'relation' as const, name: relation,
      detail: `${String((this.query as any).entity)}.${relation}` }];
    const scoped = new QueryRequest(query, this.intent, { [requestBindingToken]: true,
      parent: branch.parentRequest, comment: branch.comment, name: branch.requestName,
      operation: branch.operation, source: physical });
    const comment = (query as any)._comment ?? (query as any).commentText;
    return comment === undefined ? scoped : scoped.deriveChild(query);
  }

  /** Bind a framework helper or value query below an existing operation parent. */
  deriveChild<Q extends object>(query: Q, relation?: string, defaultComment?: string): QueryRequest<Q> {
    const source = query as any;
    const comment = source._comment ?? source.commentText;
    return new QueryRequest(query, this.intent, { [requestBindingToken]: true,
      parent: this, comment: comment === undefined ? (defaultComment ?? 'load ' + String(source.entity)) : requireText(comment, 'comment', 'query'),
      name: String(source.entity), source: relation === undefined ? this.traceSource : [...this.traceSource, {
      kind: 'relation', name: relation, detail: `${String((this.query as any).entity)}.${relation}`,
    }] });
  }
}

/** A batch also needs this root envelope; child comments are not a fallback. */
export class MutationRequest<T extends object = MutationQuery> {
  readonly #intent: MutationIntent;
  readonly #mutation: T;

  constructor(mutation: T, intent?: MutationIntent) {
    this.#intent = new MutationIntent(intent === undefined ? (mutation as any)?.comment : intent?.comment);
    this.#mutation = { ...mutation };
    Object.defineProperty(this.#mutation, 'comment', {
      value: this.#intent.comment, enumerable: true, writable: false, configurable: false,
    });
    Object.freeze(this);
  }

  get intent(): MutationIntent { return this.#intent; }
  get mutation(): T { return this.#mutation; }
  get comment(): string { return this.#intent.comment; }

  /** @internal Generated hydration/commit provenance, never a wire field. */
  withLoadedSnapshot(snapshot: LoadedScalarSnapshot): this {
    mutationSnapshots.set(this, new LoadedScalarSnapshot(snapshot.values()));
    return this;
  }
  /** @internal Does not become part of the write payload or policy input. */
  loadedValues(): Readonly<Record<string, unknown>> { return mutationSnapshots.get(this)?.values() ?? {}; }

  /** Runtime-owned execution capability; raw mutation fields cannot forge it. */
  get graphSession(): GraphMutationSession | undefined { return graphRequests.get(this)?.session; }

  scopeFor(key: EntityKey): MutationTraceScope {
    const graph = graphRequests.get(this);
    const scope = mutationScopeForEntity(graph?.parent, key.entity, key.id, this.comment, graph?.localComment);
    if (graph) scopeOwners.set(scope, graph.session);
    return scope;
  }

  traceFor(key: EntityKey): readonly TraceNode[] {
    const mutation = this.#mutation as T & { ledgerRoot?: EntityRoot; ledgerKey?: EntityKey };
    const specific = mutation.ledgerRoot?.traceChain(mutation.ledgerKey ?? key);
    return specific?.length ? cloneTraceNodes(specific) : this.scopeFor(key).recover();
  }

  /** Safe event projection; internal policy intent is never mutated. */
  auditProjection(key: EntityKey, payload: unknown, bindings?: SQLLogBindingSource): Readonly<{
    reason: string; mutationLineage: readonly TraceNode[];
  }> {
    const secrets = [...logValueStrings(payload), ...logValueStrings((this.#mutation as any).id),
      ...(bindings ? privateLogValueStrings(bindings) : logValueStrings(this.loadedValues())),
      ...privateLogValueStrings(this.graphSession?.logBindings)];
    return Object.freeze({ reason: scrubLogText(this.comment, secrets)!,
      mutationLineage: cloneTraceNodes(this.traceFor(key).map(node => ({ ...node,
        detail: scrubLogText(node.detail, secrets) }))) });
  }
}

/** One explicit graph invocation, never a Context-owned trace stack. */
export class GraphMutationSession {
  readonly #intent: MutationIntent;
  #bindings?: SQLLogBindingSource;

  constructor(intent: MutationIntent) {
    this.#intent = new MutationIntent(intent?.comment);
    Object.freeze(this);
  }
  get intent(): MutationIntent { return this.#intent; }

  request<T extends object>(mutation: T, parent?: MutationTraceScope,
    localComment?: string): MutationRequest<T> {
    if (parent && scopeOwners.get(parent) !== this)
      throw new Error('GRAPH_TRACE_SCOPE_MISMATCH: parent scope belongs to another graph invocation');
    const request = new MutationRequest(mutation, this.#intent);
    graphRequests.set(request, { session: this, parent, localComment });
    return request;
  }

  /** @internal Preflight snapshots bind provenance for all siblings before SQL. */
  captureLogBindings(source: SQLLogBindingSource): void {
    this.#bindings = inheritSQLLogBindings(source, this.#bindings);
  }
  /** @internal Never put this raw provenance on a wire or log record. */
  get logBindings(): SQLLogBindingSource | undefined { return this.#bindings; }
}

/** Database committed; retrying this operation as a rolled-back write is unsafe. */
export class GraphCommittedError extends Error {
  readonly committed = true;
  constructor(public readonly cause: unknown) {
    super('GRAPH_ALREADY_COMMITTED: post-commit processing failed; do not retry as an uncommitted mutation');
    this.name = 'GraphCommittedError';
  }
}
