import { BlobRef } from './blob-ref';
import type { UserContext } from './context';

export type ViewOptions = Readonly<{
  mode: 'ordinary' | 'governed';
  businessOutcome: 'read_only' | 'committed';
  /** Trusted host ceiling; the store may issue a shorter lifetime. */
  expiresAt?: Date;
}>;

export type AuthorizedBlobSlot = Readonly<{
  path: readonly (string | number)[];
  entity: string;
  entityId: string;
  field: string;
  scope: string;
  bindingVersion: number;
  reference: BlobRef;
}>;

/** Produced by trusted current authorization, never from request JSON. */
export type AuthorizedResponseGraph = Readonly<{
  presentation: unknown;
  blobSlots: readonly AuthorizedBlobSlot[];
}>;

export interface ResponseGraphAuthorizer {
  authorize(context: UserContext, result: unknown, options: ViewOptions): Promise<AuthorizedResponseGraph>;
}

export interface SecureDocumentContributor {
  prepare(context: UserContext, graph: AuthorizedResponseGraph, options: ViewOptions): Promise<Readonly<{
    graph: AuthorizedResponseGraph;
    envelope: unknown;
    expiresAt: Date;
  }>>;
}

export interface BlobResponseContributor {
  projectBatch(context: UserContext, graph: AuthorizedResponseGraph, expiresAt?: Date): Promise<
    readonly Readonly<{ url: string; expiresAt: Date }>[]
  >;
}

export type PreparedView = Readonly<{
  presentation: unknown;
  document?: unknown;
  expiresAt?: Date;
  cacheControl: 'private, no-store';
}>;

export class ViewPreparationError extends Error {
  constructor(readonly code: string, readonly businessState: 'read_only' | 'committed') {
    super(code);
    this.name = 'ViewPreparationError';
  }

  get retry(): 'read' | 'prepare' { return this.businessState === 'committed' ? 'read' : 'prepare'; }
}

function clone(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof BlobRef || value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new Error('VIEW_GRAPH_INVALID');
  seen.add(value);
  try {
    if (value instanceof Date) return new Date(value);
    if (Array.isArray(value)) return value.map(item => clone(item, seen));
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new Error('VIEW_GRAPH_INVALID');
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item, seen)]));
  } finally { seen.delete(value); }
}

function atPath(root: unknown, path: readonly (string | number)[]): unknown {
  if (!path.length) throw new Error('VIEW_GRAPH_INVALID');
  let node: unknown = root;
  for (const component of path) {
    if (Array.isArray(node) && typeof component === 'number' &&
        Number.isSafeInteger(component) && component >= 0 && component < node.length) {
      node = node[component];
    } else if (node && !Array.isArray(node) && typeof node === 'object' &&
        typeof component === 'string' && Object.prototype.hasOwnProperty.call(node, component)) {
      node = (node as Record<string, unknown>)[component];
    } else throw new Error('VIEW_GRAPH_INVALID');
  }
  return node;
}

function replace(root: unknown, path: readonly (string | number)[], value: string): void {
  if (!path.length) throw new Error('VIEW_GRAPH_INVALID');
  let node = root as Record<string, unknown> | unknown[];
  for (const component of path.slice(0, -1)) {
    node = (node as any)[component] as Record<string, unknown> | unknown[];
  }
  (node as any)[path[path.length - 1]] = value;
}

function containsBlobRef(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value instanceof BlobRef) return true;
  if (!value || typeof value !== 'object' || value instanceof Date) return false;
  if (seen.has(value)) throw new Error('VIEW_GRAPH_INVALID');
  seen.add(value);
  try { return Object.values(value).some(item => containsBlobRef(item, seen)); }
  finally { seen.delete(value); }
}

export class ViewPreparationService {
  async prepare(context: UserContext, result: unknown, options: ViewOptions): Promise<PreparedView> {
    try {
      if (!options || !['ordinary', 'governed'].includes(options.mode) ||
          !['read_only', 'committed'].includes(options.businessOutcome)) {
        throw new Error('VIEW_OPTIONS_INVALID');
      }
      if (options.expiresAt && (!(options.expiresAt instanceof Date) ||
          !Number.isFinite(options.expiresAt.getTime()) || options.expiresAt.getTime() <= Date.now())) {
        throw new Error('VIEW_OPTIONS_INVALID');
      }
      const authorizer = context.getResource<ResponseGraphAuthorizer>('responseGraphAuthorizer');
      if (!authorizer) throw new Error('VIEW_AUTHORIZER_MISSING');
      let graph = await authorizer.authorize(context, result, options);
      let document: unknown;
      let expiresAt = options.expiresAt;
      if (options.mode === 'governed') {
        const secure = context.getResource<SecureDocumentContributor>('secureDocumentContributor');
        if (!secure) throw new Error('DOCUMENT_CONFIGURATION');
        const prepared = await secure.prepare(context, graph, options);
        graph = prepared.graph;
        document = prepared.envelope;
        if (!(prepared.expiresAt instanceof Date) || !Number.isFinite(prepared.expiresAt.getTime()) ||
            prepared.expiresAt.getTime() <= Date.now()) {
          throw new Error('DOCUMENT_CONFIGURATION');
        }
        if (!expiresAt || prepared.expiresAt < expiresAt) expiresAt = prepared.expiresAt;
      }
      const presentation = clone(graph.presentation);
      const slots = graph.blobSlots;
      if (!Array.isArray(slots) || slots.length > 10_000) throw new Error('VIEW_GRAPH_INVALID');
      const paths = new Set<string>();
      for (const slot of slots) {
        if (!Array.isArray(slot.path) || slot.path.length === 0 || slot.path.length > 64) {
          throw new Error('VIEW_GRAPH_INVALID');
        }
        const path = JSON.stringify(slot.path);
        if (paths.has(path) || !(atPath(presentation, slot.path) instanceof BlobRef) ||
            !(atPath(presentation, slot.path) as BlobRef).equals(slot.reference)) {
          throw new Error('VIEW_GRAPH_INVALID');
        }
        paths.add(path);
      }
      if (slots.length) {
        const contributor = context.getResource<BlobResponseContributor>('blobResponseContributor');
        if (!contributor) throw new Error('BLOB_CAPABILITY_MISSING');
        const ceiling = expiresAt;
        const projected = await contributor.projectBatch(context, graph, ceiling);
        if (projected.length !== slots.length) throw new Error('BLOB_SIGN_FAILED');
        for (let index = 0; index < slots.length; index += 1) {
          const { url, expiresAt: issuedExpiry } = projected[index];
          let parsed: URL;
          try { parsed = new URL(url); } catch { throw new Error('BLOB_SIGN_FAILED'); }
          if (!['http:', 'https:'].includes(parsed.protocol) ||
              !(issuedExpiry instanceof Date) || !Number.isFinite(issuedExpiry.getTime()) ||
              issuedExpiry.getTime() <= Date.now() ||
              (ceiling && issuedExpiry > ceiling)) throw new Error('BLOB_SIGN_FAILED');
          replace(presentation, slots[index].path, url);
          if (!expiresAt || issuedExpiry < expiresAt) expiresAt = issuedExpiry;
        }
      }
      if (containsBlobRef(presentation)) throw new Error('BLOB_CAPABILITY_MISSING');
      return Object.freeze({ presentation, document, expiresAt,
        cacheControl: 'private, no-store' as const });
    } catch (error) {
      if (error instanceof ViewPreparationError) throw error;
      const safeCodes = new Set(['VIEW_OPTIONS_INVALID', 'VIEW_AUTHORIZER_MISSING',
        'VIEW_GRAPH_INVALID', 'DOCUMENT_CONFIGURATION', 'BLOB_CAPABILITY_MISSING',
        'BLOB_SIGN_FAILED', 'BLOB_READ_DENIED', 'BLOB_REFERENCE_EXPIRED',
        'BLOB_SCHEMA_MISSING', 'BLOB_CATALOG_FAILED', 'DOCUMENT_PROJECTION_VIOLATION']);
      const code = error instanceof Error && safeCodes.has(error.message)
        ? error.message : 'VIEW_PREPARATION_FAILED';
      throw new ViewPreparationError(code, options?.businessOutcome === 'committed'
        ? 'committed' : 'read_only');
    }
  }
}
