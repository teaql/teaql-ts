/** Typed vocabulary shared by SQL routing and independently owned audit lineage. */
export type TraceKind = 'operation' | 'request' | 'relation' | 'entity' | 'provider' |
  'sql' | 'comment' | 'purpose' | 'auditReason';
export type TraceNode = Readonly<{
  kind: TraceKind;
  name: string;
  /** Strings/bigints preserve unsigned-64 identities beyond JavaScript's safe integer range. */
  entityId?: string | number | bigint | null;
  detail?: string;
}>;
export type SQLTraceOperation = 'select' | 'insert' | 'update' | 'delete' | 'recover';

export function cloneTraceNodes(source: readonly TraceNode[]): readonly TraceNode[] {
  return Object.freeze(source.map(node => Object.freeze({ ...node })));
}

/** Persistent graph-local responsibility. Creating a branch is O(1). */
export class MutationTraceScope {
  readonly #parent?: MutationTraceScope;
  readonly #node: TraceNode;

  constructor(parent: MutationTraceScope | undefined, node: TraceNode) {
    this.#parent = parent;
    this.#node = Object.freeze({ ...node });
    Object.freeze(this);
  }

  recover(): readonly TraceNode[] {
    const nodes: TraceNode[] = [];
    let scope: MutationTraceScope | undefined = this;
    while (scope) { nodes.push(scope.#node); scope = scope.#parent; }
    return cloneTraceNodes(nodes.reverse());
  }
}

export function mutationScopeForEntity(parent: MutationTraceScope | undefined,
  entity: string, id: string | number | bigint, rootComment: string,
  localComment?: string): MutationTraceScope {
  const reason = parent ? localComment : rootComment;
  if (parent && (typeof reason !== 'string' || /^\p{White_Space}*$/u.test(reason))) return parent;
  const rawId = String(id);
  const entityId = /^(0|[1-9][0-9]*)$/.test(rawId) && BigInt(rawId) <= 18446744073709551615n
    ? id : undefined;
  return new MutationTraceScope(parent, { kind: 'auditReason', name: entity,
    entityId, detail: reason });
}

const intentKinds = new Set<TraceKind>(['comment', 'purpose', 'auditReason']);
const nonBlank = (value: string): boolean => !/^\p{White_Space}*$/u.test(value);

/** Pure Rust-baseline algorithm. Request validation remains a separate mandatory gate. */
export function canonicalSQLTracePath(source: readonly TraceNode[], backend: string,
  operation: SQLTraceOperation): Readonly<{
    tracePath: readonly TraceNode[]; comment?: string; purpose?: string; auditReason?: string;
  }> {
  const last = (kind: TraceKind): string | undefined => {
    for (let index = source.length - 1; index >= 0; index--) {
      if (source[index].kind === kind) return source[index].detail ?? '';
    }
    return undefined;
  };
  const canonical = ['operation', 'provider', 'sql'].every(kind => source.some(node => node.kind === kind));
  let path: readonly TraceNode[];
  if (canonical) path = source.filter(node => !intentKinds.has(node.kind));
  else {
    const root = source.find(node => nonBlank(node.name))?.name ?? 'unknown';
    let entity = root;
    if (operation !== 'select') {
      for (const node of source) if (node.kind === 'entity' && nonBlank(node.name)) entity = node.name;
    }
    path = [
      { kind: 'operation', name: root, detail: operation === 'select' ? 'query' : 'mutation' },
      { kind: operation === 'select' ? 'request' : 'entity', name: operation === 'select' ? root : entity, detail: '' },
      ...source.filter(node => node.kind === 'relation'),
      { kind: 'provider', name: nonBlank(backend) ? backend : 'unknown', detail: '' },
      { kind: 'sql', name: operation, detail: '' },
    ];
  }
  return Object.freeze({ tracePath: cloneTraceNodes(path), comment: last('comment'),
    purpose: last('purpose'), auditReason: last('auditReason') });
}

export function queryTraceSource(entity: string, comment: string, purpose: string): readonly TraceNode[] {
  return cloneTraceNodes([{ kind: 'comment', name: entity, detail: comment },
    { kind: 'purpose', name: entity, detail: purpose }]);
}
