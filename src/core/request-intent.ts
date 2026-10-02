import type { MutationQuery, SelectQuery } from './ast';
import { cloneTraceNodes, queryTraceSource, TraceNode } from './trace-chain';

// Only runtime-created snapshots carry provenance. No property supplied by a
// JSON/builder caller can forge it, and no mutable trace stack lives on Context.
const querySources = new WeakMap<object, readonly TraceNode[]>();

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

  constructor(query: T, intent?: QueryIntent) {
    const source = query as any;
    this.#intent = intent === undefined
      ? new QueryIntent(source?._comment ?? source?.commentText, source?._purpose ?? source?.purposeText)
      : new QueryIntent(intent?.comment, intent?.purpose);
    this.#query = Object.create(Object.getPrototypeOf(query), Object.getOwnPropertyDescriptors(query));
    const captured = this.#query as any;
    // Internal derivations cannot pick a nested builder's different intent.
    for (const [field, value] of [
      ['commentText', this.comment], ['purposeText', this.purpose],
      ['_comment', this.comment], ['_purpose', this.purpose],
    ] as const) {
      Object.defineProperty(captured, field, { value, enumerable: !field.startsWith('_'),
        configurable: true, writable: false });
    }
    querySources.set(captured, cloneTraceNodes(querySources.get(query)
      ?? queryTraceSource(String(source.entity), this.comment, this.purpose)));
    Object.freeze(this);
  }

  get intent(): QueryIntent { return this.#intent; }
  get query(): T { return this.#query; }
  get comment(): string { return this.#intent.comment; }
  get purpose(): string { return this.#intent.purpose; }
  get traceSource(): readonly TraceNode[] { return querySources.get(this.#query)!; }

  /** Runtime derivation preserves this invocation's source across builder clones. */
  withQuery<Q extends object>(query: Q): QueryRequest<Q> {
    const request = new QueryRequest(query, this.intent);
    querySources.set(request.query, cloneTraceNodes(this.traceSource));
    return request;
  }

  /** Append one local relation and its qualified property; never accept caller frames. */
  derive<Q extends object>(query: Q, relation: string): QueryRequest<Q> {
    const request = this.withQuery(query);
    querySources.set(request.query, cloneTraceNodes([...this.traceSource, {
      kind: 'relation', name: relation, detail: `${String((this.query as any).entity)}.${relation}`,
    }]));
    return request;
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
}
